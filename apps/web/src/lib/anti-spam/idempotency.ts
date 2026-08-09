import { createHmac, randomBytes } from 'node:crypto'

import { env } from '@/env'
import { getRedis, RedisUnavailableError } from '@/lib/redis/client'
import {
  createRateLimiter,
  type RateLimiter,
  type RateLimitResult,
  type RateLimitScope,
} from './rate-limit'

const LOCK_TTL_SECONDS = 30
const COMPLETED_TTL_SECONDS = 24 * 60 * 60

const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`

type AcquireResult = 'acquired' | 'in-progress' | 'completed'

export interface SubmissionCoordinator {
  rateLimit(scope: RateLimitScope, identity: string): Promise<RateLimitResult>
  acquire(submissionId: string): Promise<AcquireResult>
  complete(submissionId: string): Promise<void>
  release(submissionId: string): Promise<void>
}

interface IdempotencyRedis {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options: { NX?: boolean; EX: number }): Promise<string | null>
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>
}

type CoordinatorRedis = IdempotencyRedis & Parameters<typeof createRateLimiter>[0]

function namespacedPrefix(prefix: string) {
  return prefix.replace(/:+$/, '')
}

function submissionDigest(submissionId: string, secret: string) {
  return createHmac('sha256', secret).update(submissionId.normalize('NFKC').trim()).digest('hex')
}

function toUnavailable(error: unknown): never {
  if (error instanceof RedisUnavailableError) throw error
  throw new RedisUnavailableError()
}

export function createSubmissionCoordinator(
  redis: CoordinatorRedis,
  prefix: string,
  secret: string,
): SubmissionCoordinator {
  const rateLimiter: RateLimiter = createRateLimiter(redis, prefix, secret)
  const tokensByDigest = new Map<string, string>()
  const namespace = namespacedPrefix(prefix)

  function keysFor(submissionId: string) {
    const digest = submissionDigest(submissionId, secret)
    return {
      completed: `${namespace}:submission:completed:${digest}`,
      digest,
      lock: `${namespace}:submission:lock:${digest}`,
    }
  }

  async function releaseToken(digest: string, lock: string, token: string) {
    await redis.eval(RELEASE_LOCK_SCRIPT, {
      keys: [lock],
      arguments: [token],
    })
    tokensByDigest.delete(digest)
  }

  return {
    rateLimit: rateLimiter.rateLimit,

    async acquire(submissionId) {
      const { completed, digest, lock } = keysFor(submissionId)

      try {
        if ((await redis.get(completed)) !== null) return 'completed'

        const token = randomBytes(32).toString('hex')
        const acquired = await redis.set(lock, token, { NX: true, EX: LOCK_TTL_SECONDS })

        if (acquired === 'OK') {
          tokensByDigest.set(digest, token)
          if ((await redis.get(completed)) !== null) {
            await releaseToken(digest, lock, token)
            return 'completed'
          }
          return 'acquired'
        }

        return (await redis.get(completed)) !== null ? 'completed' : 'in-progress'
      } catch (error) {
        toUnavailable(error)
      }
    },

    async complete(submissionId) {
      const { completed, digest, lock } = keysFor(submissionId)

      try {
        await redis.set(completed, '1', { EX: COMPLETED_TTL_SECONDS })
        const token = tokensByDigest.get(digest)
        if (token) await releaseToken(digest, lock, token)
      } catch (error) {
        toUnavailable(error)
      }
    },

    async release(submissionId) {
      const { digest, lock } = keysFor(submissionId)
      const token = tokensByDigest.get(digest)
      if (!token) return

      try {
        await releaseToken(digest, lock, token)
      } catch (error) {
        toUnavailable(error)
      }
    },
  }
}

let environmentCoordinator: Promise<SubmissionCoordinator> | undefined

async function getEnvironmentCoordinator() {
  environmentCoordinator ??= getRedis().then((redis) =>
    createSubmissionCoordinator(redis, env.REDIS_KEY_PREFIX, env.PAYLOAD_SECRET),
  )
  try {
    return await environmentCoordinator
  } catch (error) {
    environmentCoordinator = undefined
    toUnavailable(error)
  }
}

export const submissionCoordinator: SubmissionCoordinator = {
  async rateLimit(scope, identity) {
    return (await getEnvironmentCoordinator()).rateLimit(scope, identity)
  },
  async acquire(submissionId) {
    return (await getEnvironmentCoordinator()).acquire(submissionId)
  },
  async complete(submissionId) {
    await (await getEnvironmentCoordinator()).complete(submissionId)
  },
  async release(submissionId) {
    await (await getEnvironmentCoordinator()).release(submissionId)
  },
}
