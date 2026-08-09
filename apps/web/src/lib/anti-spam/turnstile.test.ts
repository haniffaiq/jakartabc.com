import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

describe('verifyTurnstile', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    process.env.TURNSTILE_SECRET_KEY = 'sec'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.example.com:8443/path'
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    if (originalTurnstileSecret === undefined) {
      delete process.env.TURNSTILE_SECRET_KEY
    } else {
      process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret
    }
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
    }
  })

  it('returns true only when API succeeds for the configured exact hostname', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, hostname: 'www.example.com' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    )

    const requestBody = fetchMock.mock.calls[0]?.[1]?.body
    expect(requestBody).toBeInstanceOf(URLSearchParams)
    expect(requestBody.get('secret')).toBe('sec')
    expect(requestBody.get('response')).toBe('tok')
    expect(requestBody.get('remoteip')).toBe('1.2.3.4')
  })

  it('returns false on API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, hostname: 'www.example.com' }),
      }),
    )

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
  })

  it('returns false on non-ok API responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: true, hostname: 'www.example.com' }),
      }),
    )

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
  })

  it('returns false without calling the API when the token is empty', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('', '1.2.3.4')).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not bypass Cloudflare verification for an explicit e2e token', async () => {
    process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, hostname: 'www.example.com' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('e2e-turnstile-token', '127.0.0.1')).resolves.toBe(false)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([undefined, '', 'example.com', 'evil.example', 'www.example.com.', 'WWW.EXAMPLE.COM'])(
    'returns false for missing or non-exact hostname %s',
    async (hostname) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, hostname }) }),
      )

      const { verifyTurnstile } = await import('./turnstile')

      await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
    },
  )

  it('returns false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
  })

  it('aborts a stalled verification at the bounded timeout without sensitive logs', async () => {
    vi.useFakeTimers()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('verification aborted', 'AbortError')),
            { once: true },
          )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { TURNSTILE_TIMEOUT_MS, verifyTurnstile } = await import('./turnstile')
    const verification = verifyTurnstile('sensitive-visitor-token', '203.0.113.9')
    const expectation = expect(verification).resolves.toBe(false)

    await vi.advanceTimersByTimeAsync(TURNSTILE_TIMEOUT_MS)
    await expectation

    const signal = fetchMock.mock.calls[0]?.[1]?.signal
    expect(signal?.aborted).toBe(true)
    expect(consoleError).not.toHaveBeenCalled()
    expect(consoleWarn).not.toHaveBeenCalled()
  })

  it('returns false without calling the API when the secret is missing', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
