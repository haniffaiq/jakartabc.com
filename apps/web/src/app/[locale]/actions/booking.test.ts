import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createMock, findMock, sendMock, verifyMock, limitMock, renderMock, headersMock } = vi.hoisted(() => ({
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
    bookingLeadVisitor: { en: 'We received your booking request', id: 'Kami menerima permintaan konsultasi Anda' },
  },
}))
vi.mock('@react-email/components', () => ({ render: renderMock }))
vi.mock('@/lib/anti-spam/turnstile', () => ({ verifyTurnstile: verifyMock }))
vi.mock('@/lib/anti-spam/rate-limit', () => ({ checkRateLimit: limitMock }))
vi.mock('next/headers', () => ({ headers: headersMock }))

import { submitBooking } from './booking'

const goodData = new Map<string, string>([
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
    limitMock.mockReturnValue({ allowed: true })
    sendMock.mockResolvedValue({ ok: true, id: 'm_1' })
    createMock.mockResolvedValue({ id: 42 })
    headersMock.mockResolvedValue(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.2' }))
    process.env.SALES_EMAIL = 'sales@example.co'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jakartabc.com'
  })

  it('creates a booking lead, sends sales and visitor email, and returns ok', async () => {
    const res = await submitBooking(fd())

    expect(res.ok).toBe(true)
    expect(limitMock).toHaveBeenCalledWith('1.2.3.4:maria@example.co')
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
    limitMock.mockReturnValueOnce({ allowed: false, retryAfter: 3600 })

    const res = await submitBooking(fd())

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('rate')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('returns validation when submitted fields are invalid', async () => {
    const map = new Map(goodData)
    map.set('email', 'bad')

    const res = await submitBooking(fd(map))

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('validation')
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
    headersMock.mockResolvedValueOnce(new Headers({
      'x-forwarded-for': '203.0.113.44, 10.0.0.5',
      'x-real-ip': '198.51.100.7',
    }))

    const res = await submitBooking(fd())

    expect(res.ok).toBe(true)
    expect(verifyMock).toHaveBeenCalledWith('tok_x', '203.0.113.44')
    expect(limitMock).toHaveBeenCalledWith('203.0.113.44:maria@example.co')
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
