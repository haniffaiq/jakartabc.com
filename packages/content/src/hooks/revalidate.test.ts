import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  makeGlobalRevalidateHook,
  makeRevalidateDeleteHook,
  makeRevalidateHook,
} from './revalidate'

const originalEnv = { ...process.env }

const runPayloadHook = (hook: unknown, args: Record<string, unknown>) =>
  (hook as (payloadArgs: Record<string, unknown>) => Promise<unknown>)(args)

describe('makeRevalidateHook', () => {
  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('POSTs to revalidate endpoint with tags + secret header', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test'
    process.env.REVALIDATE_SECRET = 'secret-xyz'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const hook = makeRevalidateHook((doc) => [
      'insights:list',
      `insights:slug:${(doc as { slug: string }).slug}`,
    ])
    const result = await runPayloadHook(hook, { doc: { slug: 'hello' }, operation: 'update' })

    expect(result).toEqual({ slug: 'hello' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/revalidate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-revalidate-secret': 'secret-xyz' }),
      }),
    )
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)
    expect(body.tags).toEqual(['insights:list', 'insights:slug:hello'])
  })

  it('does not throw if endpoint returns non-200', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test'
    process.env.REVALIDATE_SECRET = 'secret-xyz'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    const hook = makeRevalidateHook(() => ['x'])

    await expect(runPayloadHook(hook, { doc: {}, operation: 'create' })).resolves.not.toThrow()
  })

  it('builds tags from both the changed and previous document', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test'
    process.env.REVALIDATE_SECRET = 'secret-xyz'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    const buildTags = vi.fn((doc: { slug: string }, previousDoc?: { slug: string }) => [
      `new:${doc.slug}`,
      `old:${previousDoc?.slug}`,
    ])

    const result = await runPayloadHook(makeRevalidateHook(buildTags), {
      doc: { slug: 'new' },
      previousDoc: { slug: 'old' },
      operation: 'update',
    })

    expect(result).toEqual({ slug: 'new' })
    expect(buildTags).toHaveBeenCalledWith({ slug: 'new' }, { slug: 'old' })
    expect(JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)).toEqual({
      tags: ['new:new', 'old:old'],
    })
  })

  it('logs a stable fetch failure and returns the changed document', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test'
    process.env.REVALIDATE_SECRET = 'secret-xyz'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret network detail')))
    const error = vi.fn()
    const doc = { slug: 'kept' }

    const result = await runPayloadHook(
      makeRevalidateHook(() => ['x']),
      {
        doc,
        req: { payload: { logger: { error } } },
      },
    )

    expect(result).toBe(doc)
    expect(error).toHaveBeenCalledWith('Revalidate request failed')
  })
})

describe('makeRevalidateDeleteHook', () => {
  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('posts tags built from the deleted document and returns it', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test'
    process.env.REVALIDATE_SECRET = 'secret-xyz'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    const deletedDoc = { slug: 'deleted' }

    const result = await runPayloadHook(
      makeRevalidateDeleteHook((doc: { slug: string }) => [`deleted:${doc.slug}`]),
      { doc: deletedDoc },
    )

    expect(result).toBe(deletedDoc)
    expect(JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)).toEqual({
      tags: ['deleted:deleted'],
    })
  })
})

describe('makeGlobalRevalidateHook', () => {
  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('posts tags to the secured revalidate endpoint', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jakartabc.test'
    process.env.REVALIDATE_SECRET = 'test-secret'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await runPayloadHook(
      makeGlobalRevalidateHook(() => ['site:nav']),
      {},
    )

    expect(fetchMock).toHaveBeenCalledWith('https://jakartabc.test/api/revalidate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': 'test-secret',
      },
      body: JSON.stringify({ tags: ['site:nav'] }),
    })
  })

  it('skips when revalidate env is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.REVALIDATE_SECRET
    const fetchMock = vi.fn()
    const warn = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await runPayloadHook(
      makeGlobalRevalidateHook(() => ['site:nav']),
      { req: { payload: { logger: { warn } } } },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping revalidate'))
  })
})
