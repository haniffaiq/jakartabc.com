import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY

describe('verifyTurnstile', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    process.env.TURNSTILE_SECRET_KEY = 'sec'
  })

  afterEach(() => {
    if (originalTurnstileSecret === undefined) {
      delete process.env.TURNSTILE_SECRET_KEY
    } else {
      process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret
    }
  })

  it('returns true when API returns success=true', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }))

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
  })

  it('returns false on non-ok API responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: true }) }))

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

  it('returns false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))

    const { verifyTurnstile } = await import('./turnstile')

    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
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
