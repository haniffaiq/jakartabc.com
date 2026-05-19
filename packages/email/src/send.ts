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

function fromAddr() {
  return process.env.EMAIL_FROM ?? 'no-reply@jakartabc.com'
}

async function sendViaResend(args: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY missing' }

  try {
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from: args.from ?? fromAddr(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    })

    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id ?? 'unknown' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function sendViaSmtp(args: SendArgs): Promise<SendResult> {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return { ok: false, error: 'SMTP_* env missing' }

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

    return { ok: true, id: info.messageId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase()
  const res = provider === 'smtp' ? await sendViaSmtp(args) : await sendViaResend(args)

  if (res.ok === false) console.error(`[email] send failed: ${res.error}`)
  return res
}
