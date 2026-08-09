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

const COMPLETE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then
  return 0
end
redis.call('SET', KEYS[2], '1', 'EX', ARGV[2])
redis.call('DEL', KEYS[1])
return 1
`

export type SubmissionLease = Readonly<{
  submissionId: string
  token: string
}>

export type AcquireResult =
  | { state: 'acquired'; lease: SubmissionLease }
  | { state: 'in-progress' }
  | { state: 'completed' }

export type CompleteResult = { state: 'completed' } | { state: 'lease-lost' }
export type ReleaseResult = { state: 'released' } | { state: 'lease-lost' }

export interface SubmissionCoordinator {
  rateLimit(scope: RateLimitScope, identity: string): Promise<RateLimitResult>
  acquire(submissionId: string): Promise<AcquireResult>
  complete(lease: SubmissionLease): Promise<CompleteResult>
  release(lease: SubmissionLease): Promise<ReleaseResult>
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

function parseMutationResult(result: unknown): 0 | 1 {
  if (result === 0 || result === 1) return result
  throw new RedisUnavailableError()
}

export function createSubmissionCoordinator(
  redis: CoordinatorRedis,
  prefix: string,
  secret: string,
): SubmissionCoordinator {
  const rateLimiter: RateLimiter = createRateLimiter(redis, prefix, secret)
  const namespace = namespacedPrefix(prefix)

  function keysFor(submissionId: string) {
    const digest = submissionDigest(submissionId, secret)
    return {
      completed: `${namespace}:submission:{${digest}}:completed`,
      lock: `${namespace}:submission:{${digest}}:lock`,
    }
  }

  async function releaseLease(lease: SubmissionLease) {
    const { lock } = keysFor(lease.submissionId)
    const result = await redis.eval(RELEASE_LOCK_SCRIPT, {
      keys: [lock],
      arguments: [lease.token],
    })
    return parseMutationResult(result) === 1
      ? ({ state: 'released' } as const)
      : ({ state: 'lease-lost' } as const)
  }

  return {
    rateLimit: rateLimiter.rateLimit,

    async acquire(submissionId) {
      const { completed, lock } = keysFor(submissionId)

      try {
        if ((await redis.get(completed)) !== null) return { state: 'completed' }

        const token = randomBytes(32).toString('hex')
        const acquired = await redis.set(lock, token, { NX: true, EX: LOCK_TTL_SECONDS })

        if (acquired === 'OK') {
          const lease = Object.freeze({ submissionId, token })
          if ((await redis.get(completed)) !== null) {
            await releaseLease(lease)
            return { state: 'completed' }
          }
          return { state: 'acquired', lease }
        }

        return (await redis.get(completed)) !== null
          ? { state: 'completed' }
          : { state: 'in-progress' }
      } catch (error) {
        toUnavailable(error)
      }
    },

    async complete(lease) {
      const { completed, lock } = keysFor(lease.submissionId)

      try {
        const result = await redis.eval(COMPLETE_LOCK_SCRIPT, {
          keys: [lock, completed],
          arguments: [lease.token, String(COMPLETED_TTL_SECONDS)],
        })
        return parseMutationResult(result) === 1
          ? ({ state: 'completed' } as const)
          : ({ state: 'lease-lost' } as const)
      } catch (error) {
        toUnavailable(error)
      }
    },

    async release(lease) {
      try {
        return await releaseLease(lease)
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
  async complete(lease) {
    return (await getEnvironmentCoordinator()).complete(lease)
  },
  async release(lease) {
    return (await getEnvironmentCoordinator()).release(lease)
  },
}
