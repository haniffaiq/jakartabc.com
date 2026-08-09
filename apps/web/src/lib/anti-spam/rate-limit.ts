import { createHmac } from 'node:crypto'

import { env } from '@/env'
import { getRedis, RedisUnavailableError } from '@/lib/redis/client'

const WINDOW_SECONDS = 60 * 60
const MAX_PER_WINDOW = 5

const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`

export type RateLimitScope = 'contact' | 'booking'

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfter: number }

export interface RateLimiter {
  rateLimit(scope: RateLimitScope, identity: string): Promise<RateLimitResult>
}

interface RateLimitRedis {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>
}

function namespacedPrefix(prefix: string) {
  return prefix.replace(/:+$/, '')
}

function identityDigest(identity: string, secret: string) {
  const normalizedIdentity = identity.normalize('NFKC').trim().toLowerCase()
  return createHmac('sha256', secret).update(normalizedIdentity).digest('hex')
}

function parseScriptResult(result: unknown): { count: number; ttl: number } {
  if (!Array.isArray(result) || result.length !== 2) throw new RedisUnavailableError()
  const count = Number(result[0])
  const ttl = Number(result[1])
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(ttl) || ttl < 0) {
    throw new RedisUnavailableError()
  }
  return { count, ttl }
}

function unavailable(error: unknown): never {
  if (error instanceof RedisUnavailableError) throw error
  throw new RedisUnavailableError()
}

export function createRateLimiter(
  redis: RateLimitRedis,
  prefix: string,
  secret: string,
): RateLimiter {
  return {
    async rateLimit(scope, identity) {
      const key = `${namespacedPrefix(prefix)}:rate:${scope}:${identityDigest(identity, secret)}`

      try {
        const rawResult = await redis.eval(RATE_LIMIT_SCRIPT, {
          keys: [key],
          arguments: [String(WINDOW_SECONDS)],
        })
        const { count, ttl } = parseScriptResult(rawResult)

        if (count > MAX_PER_WINDOW) {
          return { allowed: false, retryAfter: Math.max(1, ttl) }
        }

        return { allowed: true, remaining: MAX_PER_WINDOW - count }
      } catch (error) {
        unavailable(error)
      }
    },
  }
}

export const rateLimiter: RateLimiter = {
  async rateLimit(scope, identity) {
    const redis = await getRedis()
    return createRateLimiter(redis, env.REDIS_KEY_PREFIX, env.PAYLOAD_SECRET).rateLimit(
      scope,
      identity,
    )
  },
}

/**
 * Temporary compatibility boundary for legacy actions. It intentionally fails
 * closed until those actions migrate to the async coordinator.
 */
export function checkRateLimit(_identity: string): RateLimitResult {
  return { allowed: false, retryAfter: WINDOW_SECONDS }
}
