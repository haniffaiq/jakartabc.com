import nodemailer from 'nodemailer'
import { Resend } from 'resend'

export type SendArgs = {
  to: string
  subject: string
  html: string
  text: string
  from?: string
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string }

type EmailProvider = 'resend' | 'smtp'
type EmailFailureClass = 'configuration' | 'provider_rejected' | 'provider_exception'
type SendAttempt = {
  result: SendResult
  failureClass: EmailFailureClass | null
}

const UNKNOWN_PROVIDER_ERROR = 'Unknown email provider error'

function failure(error: string, failureClass: EmailFailureClass): SendAttempt {
  return { result: { ok: false, error }, failureClass }
}

function providerErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error

  if (typeof error === 'object' && error !== null) {
    try {
      const message = Reflect.get(error, 'message')
      if (typeof message === 'string') return message
    } catch {
      return UNKNOWN_PROVIDER_ERROR
    }
  }

  try {
    return String(error)
  } catch {
    return UNKNOWN_PROVIDER_ERROR
  }
}

function fromAddr() {
  return process.env.EMAIL_FROM ?? 'no-reply@jakartabc.com'
}

async function sendViaResend(args: SendArgs): Promise<SendAttempt> {
  const key = process.env.RESEND_API_KEY
  if (!key) return failure('RESEND_API_KEY missing', 'configuration')

  try {
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from: args.from ?? fromAddr(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    })

    if (error) return failure(providerErrorMessage(error), 'provider_rejected')
    return { result: { ok: true, id: data?.id ?? 'unknown' }, failureClass: null }
  } catch (err) {
    return failure(providerErrorMessage(err), 'provider_exception')
  }
}

async function sendViaSmtp(args: SendArgs): Promise<SendAttempt> {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return failure('SMTP_* env missing', 'configuration')

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
    const info = await transport.sendMail({
      from: args.from ?? fromAddr(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    })

    return { result: { ok: true, id: info.messageId }, failureClass: null }
  } catch (err) {
    return failure(providerErrorMessage(err), 'provider_exception')
  }
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const provider: EmailProvider =
    (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase() === 'smtp' ? 'smtp' : 'resend'
  const attempt = provider === 'smtp' ? await sendViaSmtp(args) : await sendViaResend(args)

  if (attempt.failureClass !== null) {
    console.error(`[email] send_failed provider=${provider} class=${attempt.failureClass}`)
  }
  return attempt.result
}
