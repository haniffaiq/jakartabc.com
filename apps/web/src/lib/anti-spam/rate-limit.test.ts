import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('rate limiter', () => {
  let limiter: typeof import('./rate-limit')

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T00:00:00.000Z'))
    limiter = await import('./rate-limit')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows up to 5 attempts in a 1 hour window per key', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(limiter.checkRateLimit('lead:1.2.3.4:maria@example.com')).toEqual({ allowed: true })
    }

    expect(limiter.checkRateLimit('lead:1.2.3.4:maria@example.com')).toEqual({
      allowed: false,
      retryAfter: 3600,
    })
  })

  it('tracks keys independently', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.checkRateLimit('lead:1.2.3.4:maria@example.com')
    }

    expect(limiter.checkRateLimit('lead:5.6.7.8:andi@example.com')).toEqual({ allowed: true })
  })

  it('resets the allowance after the window expires', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.checkRateLimit('lead:1.2.3.4:maria@example.com')
    }

    vi.advanceTimersByTime(60 * 60 * 1000 + 1)

    expect(limiter.checkRateLimit('lead:1.2.3.4:maria@example.com')).toEqual({ allowed: true })
  })
})
