import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/env', () => ({
  env: {
    PAYLOAD_SECRET: 'test-payload-secret-that-is-at-least-32-chars',
    REDIS_KEY_PREFIX: 'jakartabc:test',
    REDIS_URL: 'redis://redis:6379',
  },
}))

import { RedisUnavailableError } from '@/lib/redis/client'
import { createRateLimiter } from './rate-limit'

class FakeRateRedis {
  readonly keys: string[] = []
  readonly calls: Array<{ script: string; key: string; window: string }> = []
  private readonly counts = new Map<string, number>()

  async eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<[number, number]> {
    const key = options.keys[0] ?? ''
    const window = options.arguments[0] ?? ''
    this.keys.push(key)
    this.calls.push({ script, key, window })
    const count = (this.counts.get(key) ?? 0) + 1
    this.counts.set(key, count)
    return [count, Number(window)]
  }
}

describe('Redis rate limiter', () => {
  it('allows five concurrent requests and denies the sixth for one shared window', async () => {
    const redis = new FakeRateRedis()
    const limiter = createRateLimiter(
      redis,
      'jakartabc:test',
      'test-payload-secret-that-is-at-least-32-chars',
    )

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        limiter.rateLimit('contact', '203.0.113.9:user@example.test'),
      ),
    )

    expect(results.filter((result) => result.allowed)).toHaveLength(5)
    expect(results[4]).toEqual({ allowed: true, remaining: 0 })
    expect(results[5]).toEqual({ allowed: false, retryAfter: 3600 })
    expect(redis.calls[0]?.script).toMatch(/INCR/)
    expect(redis.calls[0]?.script).toMatch(/EXPIRE/)
    expect(redis.calls[0]?.script).toMatch(/TTL/)
    expect(redis.calls[0]?.window).toBe('3600')
  })

  it('namespaces and HMAC-hashes normalized identity without raw PII', async () => {
    const redis = new FakeRateRedis()
    const secret = 'test-payload-secret-that-is-at-least-32-chars'
    const limiter = createRateLimiter(redis, 'jakartabc:test:', secret)

    await limiter.rateLimit('contact', ' 203.0.113.9:User@Example.Test ')
    await limiter.rateLimit('contact', '203.0.113.9:user@example.test')
    await limiter.rateLimit('booking', '203.0.113.9:user@example.test')

    const digest = createHmac('sha256', secret)
      .update('203.0.113.9:user@example.test')
      .digest('hex')
    expect(redis.keys).toEqual([
      `jakartabc:test:rate:contact:${digest}`,
      `jakartabc:test:rate:contact:${digest}`,
      `jakartabc:test:rate:booking:${digest}`,
    ])
    expect(redis.keys.join(' ')).not.toContain('user@example.test')
    expect(redis.keys.join(' ')).not.toContain('203.0.113.9')
  })

  it('fails closed with a sanitized typed error when Redis fails', async () => {
    const redis = {
      eval: vi.fn().mockRejectedValue(new Error('redis://user:secret@redis:6379 unavailable')),
    }
    const limiter = createRateLimiter(
      redis,
      'jakartabc:test',
      'test-payload-secret-that-is-at-least-32-chars',
    )

    const result = limiter.rateLimit('contact', '203.0.113.9:user@example.test')

    await expect(result).rejects.toBeInstanceOf(RedisUnavailableError)
    await expect(result).rejects.not.toThrow(/user:secret|203\.0\.113\.9|example\.test/)
  })

  it('treats an invalid Redis script response as unavailable', async () => {
    const limiter = createRateLimiter(
      { eval: vi.fn().mockResolvedValue(['not-a-count', -1]) },
      'jakartabc:test',
      'test-payload-secret-that-is-at-least-32-chars',
    )

    await expect(limiter.rateLimit('contact', 'identity')).rejects.toBeInstanceOf(
      RedisUnavailableError,
    )
  })

  it('returns a positive retry delay during the final sub-second of the window', async () => {
    const limiter = createRateLimiter(
      { eval: vi.fn().mockResolvedValue([6, 0]) },
      'jakartabc:test',
      'test-payload-secret-that-is-at-least-32-chars',
    )

    await expect(limiter.rateLimit('contact', 'identity')).resolves.toEqual({
      allowed: false,
      retryAfter: 1,
    })
  })
})
