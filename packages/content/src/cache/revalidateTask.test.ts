import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  REVALIDATE_REQUEST_TIMEOUT_MS,
  revalidateCacheTask,
  runRevalidateCache,
} from './revalidateTask'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
})

describe('runRevalidateCache', () => {
  it('posts all 101 tags in deterministic chunks of at most 100', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    const tags = Array.from({ length: 101 }, (_, index) => `tag:${index}`)
    const signal = new AbortController().signal

    const result = await runRevalidateCache({
      fetchImpl: fetchMock,
      secret: 'secret',
      signalFactory: () => signal,
      siteUrl: 'https://example.test',
      tags,
    })

    expect(result).toEqual({ revalidatedTagCount: 101 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body as string).tags).toEqual(tags.slice(0, 100))
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1].body as string).tags).toEqual(tags.slice(100))
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': 'secret',
      },
      method: 'POST',
      signal,
    })
  })

  it('uses a bounded AbortSignal timeout by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })

    await runRevalidateCache({
      fetchImpl: fetchMock,
      secret: 'secret',
      siteUrl: 'https://example.test',
      tags: ['site:en'],
    })

    expect(REVALIDATE_REQUEST_TIMEOUT_MS).toBe(5_000)
    expect(fetchMock.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal)
  })

  it('throws on a failed chunk so Payload retries the whole job', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
    const tags = Array.from({ length: 201 }, (_, index) => `tag:${index}`)

    await expect(
      runRevalidateCache({
        fetchImpl: fetchMock,
        secret: 'secret',
        siteUrl: 'https://example.test',
        tags,
      }),
    ).rejects.toThrow('Cache revalidation failed with status 503')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects invalid task input before issuing a request', async () => {
    const fetchMock = vi.fn()

    await expect(
      runRevalidateCache({
        fetchImpl: fetchMock,
        secret: 'secret',
        siteUrl: 'https://example.test',
        tags: ['valid', 42] as never,
      }),
    ).rejects.toThrow('Cache revalidation tags must be strings')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('revalidateCacheTask', () => {
  it('has bounded exponential retries', () => {
    expect(revalidateCacheTask.slug).toBe('revalidate-cache')
    expect(revalidateCacheTask.retries).toEqual({
      attempts: 3,
      backoff: { delay: 1_000, type: 'exponential' },
    })
  })

  it('runs the configured handler from environment after commit', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test'
    process.env.REVALIDATE_SECRET = 'secret'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    expect(revalidateCacheTask.handler).toBeTypeOf('function')
    const handler = revalidateCacheTask.handler as unknown as (args: {
      input: { tags: string[] }
    }) => Promise<{ output: { revalidatedTagCount: number } }>

    const result = await handler({
      input: { tags: ['site:en'] },
    })

    expect(result).toEqual({ output: { revalidatedTagCount: 1 } })
  })
})
