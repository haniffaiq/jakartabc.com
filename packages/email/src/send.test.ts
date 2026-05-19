import { beforeEach, describe, expect, it, vi } from 'vitest'

const { resendSendMock, nodemailerSendMock } = vi.hoisted(() => ({
  resendSendMock: vi.fn(),
  nodemailerSendMock: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: resendSendMock } })),
}))

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: nodemailerSendMock })) },
  createTransport: vi.fn(() => ({ sendMail: nodemailerSendMock })),
}))

import { sendEmail } from './send'

const baseArgs = { to: 'x@y.com', subject: 'S', html: '<p>h</p>', text: 'h' }

describe('sendEmail', () => {
  beforeEach(() => {
    resendSendMock.mockReset()
    nodemailerSendMock.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.EMAIL_FROM = 'Jakarta BC <hello@jakartabc.com>'
    delete process.env.EMAIL_PROVIDER
    delete process.env.RESEND_API_KEY
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
  })

  it('uses Resend when EMAIL_PROVIDER=resend', async () => {
    process.env.EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 'key'
    resendSendMock.mockResolvedValue({ data: { id: 're_1' }, error: null })

    const res = await sendEmail(baseArgs)

    expect(res).toEqual({ ok: true, id: 're_1' })
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Jakarta BC <hello@jakartabc.com>',
        to: 'x@y.com',
        subject: 'S',
        html: '<p>h</p>',
        text: 'h',
      }),
    )
  })

  it('defaults to Resend and allows per-message from override', async () => {
    process.env.RESEND_API_KEY = 'key'
    resendSendMock.mockResolvedValue({ data: { id: 're_2' }, error: null })

    const res = await sendEmail({ ...baseArgs, from: 'Sales <sales@jakartabc.com>' })

    expect(res).toEqual({ ok: true, id: 're_2' })
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Sales <sales@jakartabc.com>' }),
    )
  })

  it('uses nodemailer when EMAIL_PROVIDER=smtp', async () => {
    process.env.EMAIL_PROVIDER = 'smtp'
    process.env.SMTP_HOST = 'smtp.x'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'u'
    process.env.SMTP_PASS = 'p'
    nodemailerSendMock.mockResolvedValue({ messageId: 'm_1' })

    const res = await sendEmail(baseArgs)

    expect(res).toEqual({ ok: true, id: 'm_1' })
    expect(nodemailerSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Jakarta BC <hello@jakartabc.com>',
        to: 'x@y.com',
        subject: 'S',
        html: '<p>h</p>',
        text: 'h',
      }),
    )
  })

  it('returns ok=false on Resend error', async () => {
    process.env.EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 'key'
    resendSendMock.mockResolvedValue({ data: null, error: { message: 'bounce' } })

    const res = await sendEmail({ ...baseArgs, html: 'h' })

    expect(res).toEqual({ ok: false, error: 'bounce' })
    expect(console.error).toHaveBeenCalledWith('[email] send failed: bounce')
  })

  it('returns ok=false when provider env is missing', async () => {
    process.env.EMAIL_PROVIDER = 'smtp'

    await expect(sendEmail(baseArgs)).resolves.toEqual({ ok: false, error: 'SMTP_* env missing' })
  })
})
