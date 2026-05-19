import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeGlobalRevalidateHook } from './revalidate'

const originalEnv = { ...process.env }

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

    await makeGlobalRevalidateHook(() => ['site:footer'])({})

    expect(fetchMock).toHaveBeenCalledWith(new URL('/api/revalidate', 'https://jakartabc.test'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': 'test-secret',
      },
      body: JSON.stringify({ tags: ['site:footer'] }),
    })
  })

  it('skips when revalidate env is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.REVALIDATE_SECRET
    const fetchMock = vi.fn()
    const warn = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await makeGlobalRevalidateHook(() => ['site:footer'])({ req: { payload: { logger: { warn } } } })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping revalidate'))
  })
})
