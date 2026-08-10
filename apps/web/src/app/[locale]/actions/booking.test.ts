import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createMock, findMock, sendMock, verifyMock, limitMock, renderMock, headersMock } =
  vi.hoisted(() => ({
    createMock: vi.fn(),
    findMock: vi.fn(),
    sendMock: vi.fn(),
    verifyMock: vi.fn(),
    limitMock: vi.fn(),
    renderMock: vi.fn(async () => '<html>Email</html>'),
    headersMock: vi.fn(),
  }))

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => ({ create: createMock, find: findMock })),
}))
vi.mock('@jakartabc/email/send', () => ({ sendEmail: sendMock }))
vi.mock('@jakartabc/email/templates/BookingLeadSales', () => ({
  BookingLeadSales: vi.fn(() => null),
}))
vi.mock('@jakartabc/email/templates/BookingLeadVisitor', () => ({
  BookingLeadVisitor: vi.fn(() => null),
}))
vi.mock('@jakartabc/email/i18n', () => ({
  subjects: {
    bookingLeadSales: vi.fn((service: string, name: string) => `Booking: ${service} — ${name}`),
    bookingLeadVisitor: {
      en: 'We received your booking request',
      id: 'Kami menerima permintaan konsultasi Anda',
    },
  },
}))
vi.mock('@react-email/components', () => ({ render: renderMock }))
vi.mock('@/lib/anti-spam/turnstile', () => ({ verifyTurnstile: verifyMock }))
vi.mock('@/lib/anti-spam/rate-limit', () => ({ rateLimiter: { rateLimit: limitMock } }))
vi.mock('next/headers', () => ({ headers: headersMock }))

import { submitBooking } from './booking'

const goodData = new Map<string, string>([
  ['submissionId', '11111111-1111-4111-8111-111111111111'],
  ['name', 'Maria T'],
  ['email', 'maria@example.co'],
  ['company', 'Solstice'],
  ['phone', '+81-1'],
  ['serviceSlug', 'pt-pma-setup'],
  ['message', 'Hello, I would like to set up a PT PMA.'],
  ['locale', 'en'],
  ['hp', ''],
  ['turnstileToken', 'tok_x'],
])

const trustedProxySecret = 'proxy-secret-value-that-is-at-least-32-characters'

function fd(map = goodData) {
  const formData = new FormData()
  for (const [key, value] of map.entries()) formData.append(key, value)
  formData.append('preferredWindows', 'mon-am')
  formData.append('preferredWindows', 'tue-pm')
  return formData
}

describe('submitBooking', () => {
  beforeEach(() => {
    createMock.mockReset()
    findMock.mockReset()
    sendMock.mockReset()
    verifyMock.mockReset()
    limitMock.mockReset()
    renderMock.mockClear()
    headersMock.mockReset()

    findMock.mockResolvedValue({ docs: [{ id: 1, slug: 'pt-pma-setup', name: 'PT PMA Setup' }] })
    verifyMock.mockResolvedValue(true)
    limitMock.mockResolvedValue({ allowed: true, remaining: 4 })
    sendMock.mockResolvedValue({ ok: true, id: 'm_1' })
    createMock.mockResolvedValue({ id: 42 })
    headersMock.mockResolvedValue(
      new Headers({
        'x-jbc-proxy-secret': trustedProxySecret,
        'x-forwarded-for': '1.2.3.4, 10.0.0.2',
      }),
    )
    process.env.SALES_EMAIL = 'sales@example.co'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jakartabc.com'
    process.env.TRUSTED_PROXY_SECRET = trustedProxySecret
  })

  it('creates a booking lead, sends sales and visitor email, and returns ok', async () => {
    const res = await submitBooking(fd())

    expect(res.ok).toBe(true)
    expect(limitMock).toHaveBeenCalledWith('booking', '1.2.3.4:maria@example.co')
    expect(findMock).toHaveBeenCalledWith({
      collection: 'services',
      where: { slug: { equals: 'pt-pma-setup' } },
      limit: 1,
    })
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'booking-leads',
        data: expect.objectContaining({
          email: 'maria@example.co',
          service: 1,
          preferredWindows: ['mon-am', 'tue-pm'],
          status: 'new',
        }),
      }),
    )
    expect(sendMock).toHaveBeenCalledTimes(2)
    expect(sendMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ to: 'sales@example.co' }))
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ to: 'maria@example.co' }))
  })

  it('silently succeeds without writes when the honeypot is filled', async () => {
    const map = new Map(goodData)
    map.set('hp', 'spam')

    const res = await submitBooking(fd(map))

    expect(res.ok).toBe(true)
    expect(verifyMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('returns captcha when Turnstile verification fails', async () => {
    verifyMock.mockResolvedValueOnce(false)

    const res = await submitBooking(fd())

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('captcha')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('returns rate when the IP and email key is over limit', async () => {
    limitMock.mockResolvedValueOnce({ allowed: false, retryAfter: 3600 })

    const res = await submitBooking(fd())

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('rate')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('fails closed without persistence when Redis is unavailable', async () => {
    limitMock.mockRejectedValueOnce(new Error('Redis is unavailable'))

    const res = await submitBooking(fd())

    expect(res).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(findMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('returns validation when submitted fields are invalid', async () => {
    const map = new Map(goodData)
    map.set('email', 'bad')

    const res = await submitBooking(fd(map))

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('validation')
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it.each([
    ['missing', undefined],
    ['malformed', 'reused-booking-id'],
  ])('returns validation for a %s submissionId', async (_case, submissionId) => {
    const map = new Map(goodData)
    if (submissionId === undefined) map.delete('submissionId')
    else map.set('submissionId', submissionId)

    const res = await submitBooking(fd(map))

    expect(res).toEqual({ ok: false, code: 'validation' })
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it('returns service-unknown when the submitted service slug is missing', async () => {
    findMock.mockResolvedValueOnce({ docs: [] })

    const res = await submitBooking(fd())

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('service-unknown')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('returns unknown without creating a lead when SALES_EMAIL is missing', async () => {
    delete process.env.SALES_EMAIL

    const res = await submitBooking(fd())

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('unknown')
    expect(createMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('returns unknown when service lookup fails before persistence', async () => {
    findMock.mockRejectedValueOnce(new Error('database unavailable'))

    const res = await submitBooking(fd())

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('unknown')
    expect(createMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('uses the trusted forwarded request IP for Turnstile and rate-limit keys', async () => {
    headersMock.mockResolvedValueOnce(
      new Headers({
        'x-jbc-proxy-secret': trustedProxySecret,
        'x-forwarded-for': '2001:0db8:0:0:0:0:0:1, 10.0.0.5',
        'x-real-ip': '198.51.100.7',
      }),
    )

    const res = await submitBooking(fd())

    expect(res.ok).toBe(true)
    expect(verifyMock).toHaveBeenCalledWith('tok_x', '2001:db8::1')
    expect(limitMock).toHaveBeenCalledWith('booking', '2001:db8::1:maria@example.co')
  })

  it('ignores spoofed forwarding headers with invalid proxy proof', async () => {
    headersMock.mockResolvedValueOnce(
      new Headers({
        'x-jbc-proxy-secret': 'invalid-proof',
        'x-forwarded-for': '203.0.113.44',
        'cf-connecting-ip': '198.51.100.7',
        'x-real-ip': '192.0.2.8',
      }),
    )

    const res = await submitBooking(fd())

    expect(res.ok).toBe(true)
    expect(verifyMock).toHaveBeenCalledWith('tok_x', 'unknown')
    expect(limitMock).toHaveBeenCalledWith('booking', 'unknown:maria@example.co')
  })

  it('still returns ok when the visitor email fails after sales email succeeds', async () => {
    sendMock
      .mockResolvedValueOnce({ ok: true, id: 'sales_1' })
      .mockResolvedValueOnce({ ok: false, error: 'bounce' })

    const res = await submitBooking(fd())

    expect(res.ok).toBe(true)
    expect(sendMock).toHaveBeenCalledTimes(2)
  })
})
