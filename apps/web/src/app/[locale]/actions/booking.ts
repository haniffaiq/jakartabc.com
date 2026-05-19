'use server'

import { render } from '@react-email/components'
import { headers } from 'next/headers'
import * as React from 'react'

import { subjects } from '@jakartabc/email/i18n'
import { sendEmail } from '@jakartabc/email/send'
import { BookingLeadSales } from '@jakartabc/email/templates/BookingLeadSales'
import { BookingLeadVisitor } from '@jakartabc/email/templates/BookingLeadVisitor'

import { checkRateLimit } from '@/lib/anti-spam/rate-limit'
import { verifyTurnstile } from '@/lib/anti-spam/turnstile'
import { getPayloadClient } from '@/lib/payload'
import { bookingSchema } from '@/lib/validation/booking'

export type SubmitBookingResult =
  | { ok: true }
  | { ok: false; code: 'validation' | 'captcha' | 'rate' | 'service-unknown' | 'persistence' | 'unknown' }

type ServiceDoc = {
  id: string | number
  name?: string
  title?: string
}

type PayloadBookingClient = {
  find: (args: {
    collection: 'services'
    where: { slug: { equals: string } }
    limit: number
  }) => Promise<{ docs: ServiceDoc[] }>
  create: (args: {
    collection: 'booking-leads'
    data: {
      name: string
      email: string
      company?: string
      phone?: string
      service: string | number
      preferredWindows: string[]
      message: string
      locale: 'en' | 'id'
      status: 'new'
    }
  }) => Promise<{ id: string | number }>
}

function redactEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '[redacted]'
  return `${local.slice(0, 1)}***@${domain}`
}

function formDataToBookingObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = Object.fromEntries(formData.entries())
  obj.preferredWindows = formData.getAll('preferredWindows')
  return obj
}

async function trustedClientIp() {
  const requestHeaders = await headers()
  return (
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

export async function submitBooking(formData: FormData): Promise<SubmitBookingResult> {
  const honeypot = formData.get('hp')
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    const email = formData.get('email')
    console.info(
      '[booking] honeypot triggered for',
      typeof email === 'string' ? redactEmail(email) : '[redacted]',
    )
    return { ok: true }
  }

  const parsed = bookingSchema.safeParse(formDataToBookingObject(formData))

  if (!parsed.success) {
    console.warn('[booking] validation failed')
    return { ok: false, code: 'validation' }
  }

  const data = parsed.data

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jakartabc.com'
  const salesEmail = process.env.SALES_EMAIL

  if (!salesEmail) {
    console.error('[booking] SALES_EMAIL is not configured')
    return { ok: false, code: 'unknown' }
  }

  const ip = await trustedClientIp()

  const captchaOk = await verifyTurnstile(data.turnstileToken, ip)
  if (!captchaOk) return { ok: false, code: 'captcha' }

  const rateLimit = checkRateLimit(`${ip}:${data.email}`)
  if (!rateLimit.allowed) return { ok: false, code: 'rate' }

  const payload = (await getPayloadClient()) as unknown as PayloadBookingClient
  let service: ServiceDoc | undefined
  try {
    const services = await payload.find({
      collection: 'services',
      where: { slug: { equals: data.serviceSlug } },
      limit: 1,
    })
    service = services.docs[0] as ServiceDoc | undefined
  } catch (error) {
    console.error('[booking] service lookup failed', error)
    return { ok: false, code: 'unknown' }
  }

  if (!service) return { ok: false, code: 'service-unknown' }

  let leadId: string | number
  try {
    const lead = await payload.create({
      collection: 'booking-leads',
      data: {
        name: data.name,
        email: data.email,
        company: data.company || undefined,
        phone: data.phone || undefined,
        service: service.id,
        preferredWindows: data.preferredWindows,
        message: data.message,
        locale: data.locale,
        status: 'new',
      },
    })
    leadId = lead.id
  } catch (error) {
    console.error('[booking] persistence failed', error)
    return { ok: false, code: 'persistence' }
  }

  const serviceName = service.name ?? service.title ?? data.serviceSlug
  const partnerName = 'Jakarta Business Center'
  const partnerEmail = salesEmail
  const salesHtml = await render(
    React.createElement(BookingLeadSales, {
      leadId,
      name: data.name,
      email: data.email,
      company: data.company,
      phone: data.phone,
      service: serviceName,
      preferredWindows: data.preferredWindows,
      message: data.message,
      locale: data.locale,
      siteUrl,
    }),
  )
  const adminUrl = `${siteUrl}/admin/collections/booking-leads/${leadId}`
  const salesText = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.company ? `Company: ${data.company}` : undefined,
    data.phone ? `Phone: ${data.phone}` : undefined,
    `Service: ${serviceName}`,
    `Preferred windows: ${data.preferredWindows.join(', ') || 'No preference'}`,
    '',
    data.message,
    '',
    adminUrl,
  ]
    .filter((line): line is string => typeof line === 'string')
    .join('\n')

  const salesResult = await sendEmail({
    to: salesEmail,
    subject: subjects.bookingLeadSales(serviceName, data.name),
    html: salesHtml,
    text: salesText,
  })

  if (!salesResult.ok) {
    console.error('[booking] sales email failed', salesResult.error)
    return { ok: false, code: 'unknown' }
  }

  const visitorHtml = await render(
    React.createElement(BookingLeadVisitor, {
      name: data.name,
      service: serviceName,
      locale: data.locale,
      partnerName,
      partnerEmail,
    }),
  )
  const visitorText =
    data.locale === 'id'
      ? `Halo ${data.name}, kami menerima permintaan konsultasi Anda untuk ${serviceName}.`
      : `Hello ${data.name}, we received your consultation request for ${serviceName}.`
  const visitorResult = await sendEmail({
    to: data.email,
    subject: subjects.bookingLeadVisitor[data.locale],
    html: visitorHtml,
    text: visitorText,
  })

  if (!visitorResult.ok) {
    console.warn('[booking] visitor email failed (ignored)', visitorResult.error)
  }

  return { ok: true }
}
