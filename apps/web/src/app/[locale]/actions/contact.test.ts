import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  sendEmail: vi.fn(),
  verifyTurnstile: vi.fn(),
  rateLimit: vi.fn(),
  headersGet: vi.fn(),
}))

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => ({ create: mocks.create })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: mocks.headersGet })),
}))

vi.mock('@jakartabc/email', () => ({
  ContactSales: (props: Record<string, unknown>) => `ContactSales:${String(props.messageId)}`,
  ContactVisitor: (props: Record<string, unknown>) => `ContactVisitor:${String(props.locale)}`,
  sendEmail: mocks.sendEmail,
  subjects: {
    contactSales: (name: string) => `[Contact] ${name}`,
    contactVisitor: {
      en: 'Thanks for reaching out — Jakarta Business Center',
      id: 'Terima kasih sudah menghubungi — Jakarta Business Center',
    },
  },
}))

vi.mock('@/lib/anti-spam/turnstile', () => ({
  verifyTurnstile: mocks.verifyTurnstile,
}))

vi.mock('@/lib/anti-spam/rate-limit', () => ({
  rateLimiter: { rateLimit: mocks.rateLimit },
}))

import { submitContact } from './contact'

function fd(map: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(map)) form.append(key, value)
  return form
}

const validContact = {
  name: 'Sari Wijaya',
  email: 'SARI@EXAMPLE.COM',
  company: 'Jakarta Partners',
  message: 'Hello, I would like to discuss a PT PMA setup timeline.',
  locale: 'id',
  hp: '',
  turnstileToken: 'turnstile-token',
}

describe('submitContact', () => {
  beforeEach(() => {
    mocks.create.mockReset()
    mocks.sendEmail.mockReset()
    mocks.verifyTurnstile.mockReset()
    mocks.rateLimit.mockReset()
    mocks.headersGet.mockReset()

    mocks.verifyTurnstile.mockResolvedValue(true)
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4 })
    mocks.headersGet.mockImplementation((name: string) =>
      name.toLowerCase() === 'x-forwarded-for' ? '1.1.1.1, 2.2.2.2' : null,
    )
    mocks.create.mockResolvedValue({ id: 7 })
    mocks.sendEmail.mockResolvedValue({ ok: true, id: 'message-id' })

    process.env.SALES_EMAIL = 'sales@example.com'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jakartabc.com'
  })

  it('persists the contact message and sends sales plus visitor emails', async () => {
    const result = await submitContact(fd(validContact), 'client-supplied-ip-is-ignored')

    expect(result).toEqual({ ok: true })
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith('turnstile-token', '1.1.1.1')
    expect(mocks.rateLimit).toHaveBeenCalledWith('contact', '1.1.1.1:sari@example.com')
    expect(mocks.create).toHaveBeenCalledWith({
      collection: 'contact-messages',
      data: {
        name: 'Sari Wijaya',
        email: 'sari@example.com',
        company: 'Jakarta Partners',
        message: 'Hello, I would like to discuss a PT PMA setup timeline.',
        locale: 'id',
        status: 'new',
      },
    })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: 'sales@example.com',
        subject: '[Contact] Sari Wijaya',
      }),
    )
    expect(mocks.sendEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: 'sari@example.com',
        subject: 'Terima kasih sudah menghubungi — Jakarta Business Center',
      }),
    )
  })

  it('returns ok without side effects when the honeypot is filled', async () => {
    const result = await submitContact(fd({ ...validContact, hp: 'bot-value' }), '1.1.1.1')

    expect(result).toEqual({ ok: true })
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('rejects invalid contact form data before anti-spam checks', async () => {
    const result = await submitContact(fd({ ...validContact, message: 'short' }), '1.1.1.1')

    expect(result).toEqual({ ok: false, code: 'validation' })
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
  })

  it('returns captcha when Turnstile verification fails', async () => {
    mocks.verifyTurnstile.mockResolvedValue(false)

    const result = await submitContact(fd(validContact), '1.1.1.1')

    expect(result).toEqual({ ok: false, code: 'captcha' })
    expect(mocks.rateLimit).not.toHaveBeenCalled()
  })

  it('returns rate when the rate limiter rejects the submission', async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, retryAfter: 300 })

    const result = await submitContact(fd(validContact), '1.1.1.1')

    expect(result).toEqual({ ok: false, code: 'rate' })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('fails closed without persistence when Redis is unavailable', async () => {
    mocks.rateLimit.mockRejectedValue(new Error('Redis is unavailable'))

    const result = await submitContact(fd(validContact), '1.1.1.1')

    expect(result).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('requires sales email configuration before anti-spam or persistence', async () => {
    delete process.env.SALES_EMAIL

    const result = await submitContact(fd(validContact), '1.1.1.1')

    expect(result).toEqual({ ok: false, code: 'unknown' })
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('persists without a company when the optional company field is omitted', async () => {
    const withoutCompany: Record<string, string> = { ...validContact }
    delete withoutCompany.company

    const result = await submitContact(fd(withoutCompany), '1.1.1.1')

    expect(result).toEqual({ ok: true })
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ company: undefined }),
      }),
    )
  })

  it('requires the sales email but treats the visitor email as best effort', async () => {
    mocks.sendEmail
      .mockResolvedValueOnce({ ok: true, id: 'sales-message' })
      .mockResolvedValueOnce({ ok: false, error: 'visitor bounce' })

    const result = await submitContact(fd(validContact), '1.1.1.1')

    expect(result).toEqual({ ok: true })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
  })
})
