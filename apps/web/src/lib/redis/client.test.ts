import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/env', () => ({ env: { REDIS_URL: 'redis://redis:6379' } }))

import { RedisUnavailableError, makeRedisGetter } from './client'

type ErrorListener = (error: unknown) => void

function fakeRedisClient(connect: () => Promise<unknown> = async () => undefined) {
  let errorListener: ErrorListener | undefined

  return {
    connect: vi.fn(connect),
    on: vi.fn((event: string, listener: ErrorListener) => {
      if (event === 'error') errorListener = listener
    }),
    emitError(error: unknown) {
      errorListener?.(error)
    },
  }
}

describe('lazy Redis client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates and connects one client through the same promise', async () => {
    const client = fakeRedisClient()
    const createClient = vi.fn(() => client)
    const getRedis = makeRedisGetter(createClient, 'redis://redis:6379')

    const first = getRedis()
    const second = getRedis()

    expect(first).toBe(second)
    await expect(first).resolves.toBe(client)
    expect(createClient).toHaveBeenCalledOnce()
    expect(createClient).toHaveBeenCalledWith({ url: 'redis://redis:6379' })
    expect(client.connect).toHaveBeenCalledOnce()
  })

  it('resets the cached promise after a failed initial connection', async () => {
    const failed = fakeRedisClient(async () => {
      throw new Error('connection failed')
    })
    const recovered = fakeRedisClient()
    const createClient = vi.fn().mockReturnValueOnce(failed).mockReturnValueOnce(recovered)
    const getRedis = makeRedisGetter(createClient, 'redis://redis:6379')

    await expect(getRedis()).rejects.toBeInstanceOf(RedisUnavailableError)
    await expect(getRedis()).resolves.toBe(recovered)
    expect(createClient).toHaveBeenCalledTimes(2)
    expect(failed.connect).toHaveBeenCalledOnce()
    expect(recovered.connect).toHaveBeenCalledOnce()
  })

  it('redacts connection details from failures and error-event logs', async () => {
    const redisUrl = 'redis://user:secret@redis:6379'
    const client = fakeRedisClient(async () => {
      throw new Error(`cannot connect to ${redisUrl}`)
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const getRedis = makeRedisGetter(() => client, redisUrl)

    const result = getRedis()
    client.emitError(new Error(`socket failed for ${redisUrl}`))

    await expect(result).rejects.toMatchObject({
      name: 'RedisUnavailableError',
      message: 'Redis is unavailable',
    })
    await expect(result).rejects.not.toThrow(/user|secret|redis:6379/)
    expect(consoleError).toHaveBeenCalledWith('redis-client-error')
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/user|secret|redis:6379/)
  })
})
