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
  readonly ttls = new Map<string, number>()
  readonly setCalls: Array<{ key: string; value: string; options: SetOptions }> = []
  readonly evalCalls: Array<{ script: string; keys: string[]; arguments: string[] }> = []

  async get(key: string) {
    return this.values.get(key) ?? null
  }

  async set(key: string, value: string, options: SetOptions) {
    this.setCalls.push({ key, value, options })
    if (options.NX && this.values.has(key)) return null
    this.values.set(key, value)
    this.ttls.set(key, options.EX)
    return 'OK'
  }

  async eval(script: string, options: { keys: string[]; arguments: string[] }) {
    this.evalCalls.push({ script, ...options })
    const lockKey = options.keys[0] ?? ''
    const token = options.arguments[0] ?? ''
    if (this.values.get(lockKey) !== token) return 0

    if (options.keys.length === 2) {
      const completedKey = options.keys[1] ?? ''
      const completedTtl = Number(options.arguments[1])
      this.values.set(completedKey, '1')
      this.ttls.set(completedKey, completedTtl)
    }

    this.values.delete(lockKey)
    this.ttls.delete(lockKey)
    return 1
  }

  expireLock(key: string) {
    this.values.delete(key)
    this.ttls.delete(key)
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

    const acquired = await coordinator.acquire(id)
    expect(acquired.state).toBe('acquired')
    if (acquired.state !== 'acquired') throw new Error('expected acquired lease')
    expect(await coordinator.acquire(id)).toEqual({ state: 'in-progress' })
    await coordinator.complete(acquired.lease)
    expect(await coordinator.acquire(id)).toEqual({ state: 'completed' })

    expect(redis.setCalls[0]?.options).toEqual({ NX: true, EX: 30 })
    const completedKey = [...redis.ttls.keys()].find((key) => key.includes(':completed:'))
    expect(completedKey).toBeDefined()
    expect(redis.ttls.get(completedKey ?? '')).toBe(86_400)
    expect(redis.evalCalls.find((call) => call.keys.length === 2)?.script).toMatch(/SET/)
  })

  it('never puts the raw submission identifier in Redis keys', async () => {
    const redis = new FakeIdempotencyRedis()
    const coordinator = createSubmissionCoordinator(
      redis,
      'jakartabc:test:',
      'test-payload-secret-that-is-at-least-32-chars',
    )
    const id = 'visitor-provided-submission-id'

    const acquired = await coordinator.acquire(id)
    if (acquired.state !== 'acquired') throw new Error('expected acquired lease')
    await coordinator.complete(acquired.lease)

    expect([...redis.values.keys(), ...redis.setCalls.map(({ key }) => key)]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^jakartabc:test:submission:lock:[a-f0-9]{64}$/),
        expect.stringMatching(/^jakartabc:test:submission:completed:[a-f0-9]{64}$/),
      ]),
    )
    expect(JSON.stringify(redis.setCalls)).not.toContain(id)
  })

  it('keeps a newer lease owned when a stale request releases and completes', async () => {
    const redis = new FakeIdempotencyRedis()
    const coordinator = createSubmissionCoordinator(
      redis,
      'jakartabc:test',
      'test-payload-secret-that-is-at-least-32-chars',
    )
    const id = '0198a920-e457-7f33-bbf1-bd4dc1635266'

    const requestA = await coordinator.acquire(id)
    if (requestA.state !== 'acquired') throw new Error('expected request A lease')
    const lockKey = redis.setCalls[0]?.key ?? ''
    redis.expireLock(lockKey)

    const requestB = await coordinator.acquire(id)
    if (requestB.state !== 'acquired') throw new Error('expected request B lease')

    await coordinator.release(requestA.lease)
    await coordinator.complete(requestA.lease)

    expect(redis.values.get(lockKey)).toBe(requestB.lease.token)
    expect(
      redis.values.has([...redis.values.keys()].find((key) => key.includes(':completed:')) ?? ''),
    ).toBe(false)
    expect(requestA.lease.token).not.toBe(requestB.lease.token)

    await coordinator.complete(requestB.lease)
    expect(redis.values.has(lockKey)).toBe(false)
    expect([...redis.values.keys()]).toEqual([
      expect.stringMatching(/^jakartabc:test:submission:completed:[a-f0-9]{64}$/),
    ])
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
