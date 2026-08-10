'use server'

import { isDeepStrictEqual } from 'node:util'
import { render } from '@react-email/components'
import { headers } from 'next/headers'
import * as React from 'react'

import { subjects } from '@jakartabc/email/i18n'
import { sendEmail } from '@jakartabc/email/send'
import { BookingLeadSales } from '@jakartabc/email/templates/BookingLeadSales'
import { BookingLeadVisitor } from '@jakartabc/email/templates/BookingLeadVisitor'

import { submissionCoordinator, type SubmissionLease } from '@/lib/anti-spam/idempotency'
import { verifyTurnstile } from '@/lib/anti-spam/turnstile'
import { getPayloadClient } from '@/lib/payload'
import { getClientIP } from '@/lib/request/client-ip'
import {
  attemptDelivery,
  beginDeliveryAttempt,
  type DeliveryStatus,
  type DeliveryTransition,
} from '@/lib/submissions/delivery'
import { bookingSchema, type BookingInput } from '@/lib/validation/booking'

export type SubmitBookingResult =
  | { ok: true; submissionId: string; delivery: DeliveryStatus }
  | {
      ok: false
      code:
        | 'validation'
        | 'captcha'
        | 'rate'
        | 'service-unknown'
        | 'temporarily-unavailable'
        | 'unknown'
    }

type ServiceDoc = {
  id: string | number
  name?: string
  title?: string
}

type BookingLeadDoc = {
  id: string | number
  submissionId?: string | null
  deliveryStatus?: unknown
  deliveryAttempts?: unknown
  name?: unknown
  email?: unknown
  company?: unknown
  phone?: unknown
  service?: unknown
  preferredWindows?: unknown
  message?: unknown
  locale?: unknown
}

type PayloadBookingClient = {
  find: (args: {
    collection: 'services' | 'booking-leads'
    where: Record<string, { equals: string }>
    limit: number
    overrideAccess: true
    depth?: number
  }) => Promise<{ docs: Array<ServiceDoc | BookingLeadDoc> }>
  create: (args: {
    collection: 'booking-leads'
    overrideAccess: true
    depth: number
    locale: 'en' | 'id'
    data: Record<string, unknown>
  }) => Promise<BookingLeadDoc>
  update: (args: {
    collection: 'booking-leads'
    id: string | number
    overrideAccess: true
    data: DeliveryTransition
  }) => Promise<BookingLeadDoc>
}

const persistedBookingMailSchema = bookingSchema.pick({
  name: true,
  email: true,
  company: true,
  phone: true,
  preferredWindows: true,
  message: true,
  locale: true,
})

type BookingMailData = Pick<
  BookingInput,
  'name' | 'email' | 'company' | 'phone' | 'preferredWindows' | 'message' | 'locale'
>

function formDataToBookingObject(formData: FormData): Record<string, unknown> {
  return {
    ...Object.fromEntries(formData.entries()),
    preferredWindows: formData.getAll('preferredWindows'),
  }
}

function accepted(submissionId: string, delivery: DeliveryStatus): SubmitBookingResult {
  return { ok: true, submissionId, delivery }
}

function operationalFailure(submissionId: string, event: string): SubmitBookingResult {
  console.error(`[booking] ${event}`, { submissionId })
  return { ok: false, code: 'temporarily-unavailable' }
}

function deliveryState(document: BookingLeadDoc): DeliveryStatus | null {
  const value = document.deliveryStatus
  return value === 'pending' || value === 'sent' || value === 'failed' ? value : null
}

function canResumeBeforeOwnerAttempt(document: BookingLeadDoc) {
  return deliveryState(document) === 'pending' && document.deliveryAttempts === 0
}

function hydratePersistedBookingMail(
  document: BookingLeadDoc,
): { data: BookingMailData; serviceName: string } | null {
  try {
    const parsed = persistedBookingMailSchema.safeParse({
      name: document.name,
      email: document.email,
      company: document.company ?? '',
      phone: document.phone ?? '',
      preferredWindows: document.preferredWindows ?? [],
      message: document.message,
      locale: document.locale,
    })
    if (!parsed.success || typeof document.service !== 'object' || document.service === null) {
      return null
    }

    const service = document.service as Record<string, unknown>
    const serviceId = service.id
    const serviceName = service.name
    if (
      (typeof serviceId !== 'string' && typeof serviceId !== 'number') ||
      (typeof serviceId === 'string' && serviceId.trim().length === 0) ||
      (typeof serviceId === 'number' && (!Number.isSafeInteger(serviceId) || serviceId <= 0)) ||
      typeof serviceName !== 'string' ||
      serviceName.trim().length === 0
    ) {
      return null
    }

    return { data: parsed.data, serviceName: serviceName.trim() }
  } catch {
    return null
  }
}

async function releaseLease(lease: SubmissionLease) {
  try {
    const result = await submissionCoordinator.release(lease)
    return result.state === 'released'
  } catch {
    return false
  }
}

async function completeLease(lease: SubmissionLease) {
  try {
    const result = await submissionCoordinator.complete(lease)
    return result.state === 'completed'
  } catch {
    return false
  }
}

async function findBookingBySubmissionId(
  payload: PayloadBookingClient,
  submissionId: string,
): Promise<BookingLeadDoc | undefined> {
  const result = await payload.find({
    collection: 'booking-leads',
    where: { submissionId: { equals: submissionId } },
    limit: 1,
    overrideAccess: true,
    depth: 1,
  })
  return result.docs[0] as BookingLeadDoc | undefined
}

function ownerMail({
  data,
  leadId,
  salesEmail,
  serviceName,
  siteUrl,
}: {
  data: BookingMailData
  leadId: string | number
  salesEmail: string
  serviceName: string
  siteUrl: string
}) {
  return async () => {
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

    return sendEmail({
      to: salesEmail,
      subject: subjects.bookingLeadSales(serviceName, data.name),
      html: salesHtml,
      text: salesText,
    })
  }
}

async function sendVisitorMail({
  data,
  salesEmail,
  serviceName,
}: {
  data: BookingMailData
  salesEmail: string
  serviceName: string
}) {
  const visitorHtml = await render(
    React.createElement(BookingLeadVisitor, {
      name: data.name,
      service: serviceName,
      locale: data.locale,
      partnerName: 'Jakarta Business Center',
      partnerEmail: salesEmail,
    }),
  )
  const visitorText =
    data.locale === 'id'
      ? `Halo ${data.name}, kami menerima permintaan konsultasi Anda untuk ${serviceName}.`
      : `Hello ${data.name}, we received your consultation request for ${serviceName}.`

  await sendEmail({
    to: data.email,
    subject: subjects.bookingLeadVisitor[data.locale],
    html: visitorHtml,
    text: visitorText,
  })
}

async function reconcileExisting(
  existing: BookingLeadDoc,
  lease: SubmissionLease,
  submissionId: string,
): Promise<SubmitBookingResult> {
  const delivery = deliveryState(existing)
  if (!delivery) {
    await releaseLease(lease)
    return operationalFailure(submissionId, 'invalid-existing-delivery-state')
  }
  if (delivery === 'pending') {
    console.warn('[booking] existing-delivery-pending', { submissionId })
  }
  if (!(await completeLease(lease))) {
    return operationalFailure(submissionId, 'idempotency-complete-failed')
  }
  return accepted(submissionId, delivery)
}

export async function submitBooking(formData: FormData): Promise<SubmitBookingResult> {
  const parsed = bookingSchema.safeParse(formDataToBookingObject(formData))
  if (!parsed.success) return { ok: false, code: 'validation' }

  const data = parsed.data
  if (data.hp) return accepted(data.submissionId, 'pending')

  const salesEmail = process.env.SALES_EMAIL
  if (!salesEmail) return operationalFailure(data.submissionId, 'owner-recipient-unavailable')

  let ip: string
  try {
    ip = getClientIP(await headers())
  } catch {
    return operationalFailure(data.submissionId, 'request-identity-unavailable')
  }

  let captchaOk: boolean
  try {
    captchaOk = await verifyTurnstile(data.turnstileToken, ip)
  } catch {
    return operationalFailure(data.submissionId, 'captcha-provider-unavailable')
  }
  if (!captchaOk) return { ok: false, code: 'captcha' }

  try {
    const rate = await submissionCoordinator.rateLimit('booking', `${ip}:${data.email}`)
    if (!rate.allowed) return { ok: false, code: 'rate' }
  } catch {
    return operationalFailure(data.submissionId, 'rate-limit-unavailable')
  }

  let acquisition
  try {
    acquisition = await submissionCoordinator.acquire(data.submissionId)
  } catch {
    return operationalFailure(data.submissionId, 'idempotency-acquire-failed')
  }

  if (acquisition.state === 'in-progress') return accepted(data.submissionId, 'pending')

  let payload: PayloadBookingClient
  try {
    payload = (await getPayloadClient()) as unknown as PayloadBookingClient
  } catch {
    if (acquisition.state === 'acquired') await releaseLease(acquisition.lease)
    return operationalFailure(data.submissionId, 'database-client-unavailable')
  }

  if (acquisition.state === 'completed') {
    try {
      const existing = await findBookingBySubmissionId(payload, data.submissionId)
      const delivery = existing ? deliveryState(existing) : null
      return delivery
        ? accepted(data.submissionId, delivery)
        : operationalFailure(data.submissionId, 'completed-row-unavailable')
    } catch {
      return operationalFailure(data.submissionId, 'completed-row-lookup-failed')
    }
  }

  const lease = acquisition.lease
  let existing: BookingLeadDoc | undefined
  try {
    existing = await findBookingBySubmissionId(payload, data.submissionId)
  } catch {
    await releaseLease(lease)
    return operationalFailure(data.submissionId, 'submission-lookup-failed')
  }
  let lead = existing
  if (lead && !canResumeBeforeOwnerAttempt(lead)) {
    return reconcileExisting(lead, lease, data.submissionId)
  }

  if (!lead) {
    let service: ServiceDoc | undefined
    try {
      const services = await payload.find({
        collection: 'services',
        where: { slug: { equals: data.serviceSlug } },
        limit: 1,
        overrideAccess: true,
      })
      service = services.docs[0] as ServiceDoc | undefined
    } catch {
      await releaseLease(lease)
      return operationalFailure(data.submissionId, 'service-lookup-failed')
    }

    if (!service) {
      if (!(await releaseLease(lease))) {
        return operationalFailure(data.submissionId, 'idempotency-release-failed')
      }
      return { ok: false, code: 'service-unknown' }
    }

    try {
      lead = await payload.create({
        collection: 'booking-leads',
        overrideAccess: true,
        depth: 1,
        locale: data.locale,
        data: {
          submissionId: data.submissionId,
          name: data.name,
          email: data.email,
          company: data.company || undefined,
          phone: data.phone || undefined,
          service: service.id,
          preferredWindows: data.preferredWindows,
          message: data.message,
          locale: data.locale,
          status: 'new',
          deliveryStatus: 'pending',
          deliveryAttempts: 0,
          lastDeliveryAttemptAt: null,
          deliveredAt: null,
          deliveryError: null,
        },
      })
    } catch {
      let raced: BookingLeadDoc | undefined
      try {
        raced = await findBookingBySubmissionId(payload, data.submissionId)
      } catch {
        // A stable event below covers both create and reconciliation lookup failures.
      }
      if (!raced) {
        await releaseLease(lease)
        return operationalFailure(data.submissionId, 'submission-create-failed')
      }
      if (!canResumeBeforeOwnerAttempt(raced)) {
        return reconcileExisting(raced, lease, data.submissionId)
      }
      lead = raced
    }
  }

  const persistedMail = hydratePersistedBookingMail(lead)
  if (!persistedMail) {
    await releaseLease(lease)
    return operationalFailure(data.submissionId, 'persisted-booking-hydration-failed')
  }

  const attemptedAt = new Date()
  const pending = beginDeliveryAttempt(0, attemptedAt)
  try {
    await payload.update({
      collection: 'booking-leads',
      id: lead.id,
      overrideAccess: true,
      data: pending,
    })
  } catch {
    await releaseLease(lease)
    return operationalFailure(data.submissionId, 'delivery-pending-persist-failed')
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jakartabc.com'
  let clockCalls = 0
  const delivery = await attemptDelivery({
    currentAttempts: 0,
    send: ownerMail({
      data: persistedMail.data,
      leadId: lead.id,
      salesEmail,
      serviceName: persistedMail.serviceName,
      siteUrl,
    }),
    clock: () => (clockCalls++ === 0 ? attemptedAt : new Date()),
  })

  if (!isDeepStrictEqual(delivery.pending, pending)) {
    await releaseLease(lease)
    return operationalFailure(data.submissionId, 'delivery-pending-transition-diverged')
  }

  try {
    await payload.update({
      collection: 'booking-leads',
      id: lead.id,
      overrideAccess: true,
      data: delivery.final,
    })
  } catch {
    await releaseLease(lease)
    return operationalFailure(data.submissionId, 'delivery-final-persist-failed')
  }

  try {
    await sendVisitorMail({
      data: persistedMail.data,
      salesEmail,
      serviceName: persistedMail.serviceName,
    })
  } catch {
    console.warn('[booking] visitor-delivery-failed', { submissionId: data.submissionId })
  }

  if (!(await completeLease(lease))) {
    return operationalFailure(data.submissionId, 'idempotency-complete-failed')
  }

  return accepted(data.submissionId, delivery.final.deliveryStatus)
}
