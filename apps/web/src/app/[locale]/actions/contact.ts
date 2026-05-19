'use server'

import { render } from '@react-email/components'
import { headers } from 'next/headers'
import * as React from 'react'
import { ContactSales, ContactVisitor, sendEmail, subjects } from '@jakartabc/email'

import { checkRateLimit } from '@/lib/anti-spam/rate-limit'
import { verifyTurnstile } from '@/lib/anti-spam/turnstile'
import { getPayloadClient } from '@/lib/payload'
import { contactSchema } from '@/lib/validation/contact'

export type SubmitResult =
  | { ok: true }
  | { ok: false; code: 'validation' | 'captcha' | 'rate' | 'persistence' | 'unknown' }

function optionalCompany(company: string | undefined) {
  const trimmed = company?.trim() ?? ''
  return trimmed ? trimmed : undefined
}

async function getTrustedClientIp() {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || requestHeaders.get('cf-connecting-ip') || requestHeaders.get('x-real-ip') || 'unknown'
}

export async function submitContact(formData: FormData, _ip?: string): Promise<SubmitResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { ok: false, code: 'validation' }

  const data = parsed.data
  if (data.hp) return { ok: true }

  const salesEmail = process.env.SALES_EMAIL
  if (!salesEmail) return { ok: false, code: 'unknown' }

  const ip = await getTrustedClientIp()

  const captchaOk = await verifyTurnstile(data.turnstileToken, ip)
  if (!captchaOk) return { ok: false, code: 'captcha' }

  const rate = checkRateLimit(`${ip}:${data.email}`)
  if (!rate.allowed) return { ok: false, code: 'rate' }

  const company = optionalCompany(data.company)
  const payload = (await getPayloadClient()) as {
    create: (args: { collection: string; data: Record<string, unknown> }) => Promise<{ id: string | number }>
  }
  let id: string | number

  try {
    const message = await payload.create({
      collection: 'contact-messages',
      data: {
        name: data.name,
        email: data.email,
        company,
        message: data.message,
        locale: data.locale,
        status: 'new',
      },
    })
    id = message.id
  } catch (err) {
    console.error('[contact] persistence failed', err)
    return { ok: false, code: 'persistence' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jakartabc.com'

  const salesHtml = await render(
    React.createElement(ContactSales, {
      messageId: id,
      name: data.name,
      email: data.email,
      company,
      message: data.message,
      locale: data.locale,
      siteUrl,
    }),
  )
  const salesResult = await sendEmail({
    to: salesEmail,
    subject: subjects.contactSales(data.name),
    html: salesHtml,
    text: `${data.name} <${data.email}>${company ? `\n${company}` : ''}\n\n${data.message}`,
  })

  if (!salesResult.ok) {
    console.error('[contact] sales email failed', salesResult.error)
    return { ok: false, code: 'unknown' }
  }

  const visitorHtml = await render(
    React.createElement(ContactVisitor, {
      name: data.name,
      locale: data.locale,
      replyEmail: process.env.EMAIL_FROM ?? 'hello@jakartabc.com',
    }),
  )
  const visitorResult = await sendEmail({
    to: data.email,
    subject: subjects.contactVisitor[data.locale],
    html: visitorHtml,
    text:
      data.locale === 'id'
        ? `Halo ${data.name},\n\nKami menerima pesan Anda dan akan membalas dalam 1 hari kerja. Bila mendesak, silakan kirim ke alamat di bawah.`
        : `Hi ${data.name},\n\nWe received your message and will reply within one business day. If urgent, you can also write directly to the address below.`,
  })

  if (!visitorResult.ok) console.warn('[contact] visitor email failed (ignoring)', visitorResult.error)

  return { ok: true }
}
