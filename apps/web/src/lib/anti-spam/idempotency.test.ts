import { describe, expect, it, vi } from 'vitest'

vi.mock('@/env', () => ({
  env: {
    PAYLOAD_SECRET: 'test-payload-secret-that-is-at-least-32-chars',
    REDIS_KEY_PREFIX: 'jakartabc:test',
    REDIS_URL: 'redis://redis:6379',
  },
}))

import { RedisUnavailableError } from '@/lib/redis/client'
import { createSubmissionCoordinator } from './idempotency'

type SetOptions = { NX?: boolean; EX: number }

class FakeIdempotencyRedis {
  readonly values = new Map<string, string>()
  readonly setCalls: Array<{ key: string; value: string; options: SetOptions }> = []
  readonly evalCalls: Array<{ key: string; token: string }> = []

  async get(key: string) {
    return this.values.get(key) ?? null
  }

  async set(key: string, value: string, options: SetOptions) {
    this.setCalls.push({ key, value, options })
    if (options.NX && this.values.has(key)) return null
    this.values.set(key, value)
    return 'OK'
  }

  async eval(_script: string, options: { keys: string[]; arguments: string[] }) {
    const key = options.keys[0] ?? ''
    const token = options.arguments[0] ?? ''
    this.evalCalls.push({ key, token })
    if (this.values.get(key) !== token) return 0
    this.values.delete(key)
    return 1
  }
}

describe('submission idempotency coordinator', () => {
  it('moves one submission from acquired to in-progress to completed', async () => {
    const redis = new FakeIdempotencyRedis()
    const coordinator = createSubmissionCoordinator(
      redis,
      'jakartabc:test',
      'test-payload-secret-that-is-at-least-32-chars',
    )
    const id = '0198a920-e457-7f33-bbf1-bd4dc1635266'

    expect(await coordinator.acquire(id)).toBe('acquired')
    expect(await coordinator.acquire(id)).toBe('in-progress')
    await coordinator.complete(id)
    expect(await coordinator.acquire(id)).toBe('completed')

    expect(redis.setCalls[0]?.options).toEqual({ NX: true, EX: 30 })
    expect(redis.setCalls.find((call) => call.key.includes(':completed:'))?.options).toEqual({
      EX: 86_400,
    })
  })

  it('never puts the raw submission identifier in Redis keys', async () => {
    const redis = new FakeIdempotencyRedis()
    const coordinator = createSubmissionCoordinator(
      redis,
      'jakartabc:test:',
      'test-payload-secret-that-is-at-least-32-chars',
    )
    const id = 'visitor-provided-submission-id'

    await coordinator.acquire(id)
    await coordinator.complete(id)

    expect(redis.setCalls.map(({ key }) => key)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^jakartabc:test:submission:lock:[a-f0-9]{64}$/),
        expect.stringMatching(/^jakartabc:test:submission:completed:[a-f0-9]{64}$/),
      ]),
    )
    expect(JSON.stringify(redis.setCalls)).not.toContain(id)
  })

  it('uses compare-token release and cannot delete another request lock', async () => {
    const redis = new FakeIdempotencyRedis()
    const coordinator = createSubmissionCoordinator(
      redis,
      'jakartabc:test',
      'test-payload-secret-that-is-at-least-32-chars',
    )
    const id = '0198a920-e457-7f33-bbf1-bd4dc1635266'

    await coordinator.acquire(id)
    const lockKey = redis.setCalls[0]?.key ?? ''
    redis.values.set(lockKey, 'another-request-token')
    await coordinator.release(id)

    expect(redis.values.get(lockKey)).toBe('another-request-token')
    expect(redis.evalCalls).toHaveLength(1)
    expect(redis.evalCalls[0]?.token).not.toBe('another-request-token')
  })

  it('fails closed with RedisUnavailableError and no memory fallback', async () => {
    const redis = {
      get: vi.fn().mockRejectedValue(new Error('redis password leak')),
      set: vi.fn(),
      eval: vi.fn(),
    }
    const coordinator = createSubmissionCoordinator(
      redis,
      'jakartabc:test',
      'test-payload-secret-that-is-at-least-32-chars',
    )

    await expect(coordinator.acquire('submission')).rejects.toMatchObject({
      name: 'RedisUnavailableError',
      message: 'Redis is unavailable',
    })
    await expect(coordinator.acquire('submission')).rejects.toBeInstanceOf(RedisUnavailableError)
  })
})
