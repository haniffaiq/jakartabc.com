'use server'

import { render } from '@react-email/components'
import * as React from 'react'

import { subjects } from '@jakartabc/email/i18n'
import { sendEmail } from '@jakartabc/email/send'
import { BookingLeadSales } from '@jakartabc/email/templates/BookingLeadSales'
import { BookingLeadVisitor } from '@jakartabc/email/templates/BookingLeadVisitor'

import type { DeliveryStatus } from '@/lib/submissions/delivery'
import {
  runSubmission,
  type SubmissionDocument,
  type SubmissionPipeline,
} from '@/lib/submissions/pipeline'
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

type BookingFailureCode = Extract<SubmitBookingResult, { ok: false }>['code']

const mailSchema = bookingSchema.pick({
  name: true,
  email: true,
  company: true,
  phone: true,
  preferredWindows: true,
  message: true,
  locale: true,
})

type BookingMail = ReturnType<typeof mailSchema.parse> & { serviceName: string }

function formDataToBookingObject(formData: FormData): Record<string, unknown> {
  return {
    ...Object.fromEntries(formData.entries()),
    preferredWindows: formData.getAll('preferredWindows'),
  }
}

/** Pull the localized service name off a `locale: 'all'` relation payload. */
function localizedServiceName(service: unknown, locale: 'en' | 'id') {
  if (typeof service !== 'object' || service === null) return null

  const { id, name } = service as { id?: unknown; name?: unknown }
  const validId =
    (typeof id === 'string' && id.trim().length > 0) ||
    (typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
  if (!validId || typeof name !== 'object' || name === null) return null

  const localized = (name as Record<string, unknown>)[locale]
  return typeof localized === 'string' && localized.trim().length > 0 ? localized.trim() : null
}

const bookingPipeline: SubmissionPipeline<BookingInput, BookingMail, BookingFailureCode> = {
  name: 'booking',
  collection: 'booking-leads',
  rateLimitScope: 'booking',
  // `create` cannot return the localized service relation, so re-read the row.
  readAfterCreate: true,
  rejectionCodes: { captcha: 'captcha', rate: 'rate' },

  // Every failure point here is an infrastructure fault the caller may retry.
  failureCode: () => 'temporarily-unavailable',

  findArgs: (submissionId) => ({
    where: { submissionId: { equals: submissionId } },
    limit: 1,
    overrideAccess: true,
    depth: 1,
    locale: 'all',
  }),

  prepareCreate: async ({ input, payload }) => {
    let service: { id?: unknown } | undefined
    try {
      const services = await payload.find({
        collection: 'services',
        where: { slug: { equals: input.serviceSlug } },
        limit: 1,
        overrideAccess: true,
        locale: input.locale,
      })
      service = services.docs[0]
    } catch {
      return { state: 'unavailable' }
    }

    if (!service) return { state: 'rejected', code: 'service-unknown' }

    return {
      state: 'ready',
      args: { depth: 1, locale: input.locale },
      data: {
        submissionId: input.submissionId,
        name: input.name,
        email: input.email,
        company: input.company || undefined,
        phone: input.phone || undefined,
        service: service.id,
        preferredWindows: input.preferredWindows,
        message: input.message,
        locale: input.locale,
        status: 'new',
        deliveryStatus: 'pending',
        deliveryAttempts: 0,
        lastDeliveryAttemptAt: null,
        deliveredAt: null,
        deliveryError: null,
      },
    }
  },

  hydrate: (document: SubmissionDocument) => {
    const parsed = mailSchema.safeParse({
      name: document.name,
      email: document.email,
      company: document.company ?? '',
      phone: document.phone ?? '',
      preferredWindows: document.preferredWindows ?? [],
      message: document.message,
      locale: document.locale,
    })
    if (!parsed.success) return null

    const serviceName = localizedServiceName(document.service, parsed.data.locale)
    return serviceName ? { ...parsed.data, serviceName } : null
  },

  prepareOwnerDelivery: async ({ hydrated, id, salesEmail, siteUrl }) => {
    const html = await render(
      React.createElement(BookingLeadSales, {
        leadId: id,
        name: hydrated.name,
        email: hydrated.email,
        company: hydrated.company,
        phone: hydrated.phone,
        service: hydrated.serviceName,
        preferredWindows: hydrated.preferredWindows,
        message: hydrated.message,
        locale: hydrated.locale,
        siteUrl,
      }),
    )
    const text = [
      `Name: ${hydrated.name}`,
      `Email: ${hydrated.email}`,
      hydrated.company ? `Company: ${hydrated.company}` : undefined,
      hydrated.phone ? `Phone: ${hydrated.phone}` : undefined,
      `Service: ${hydrated.serviceName}`,
      `Preferred windows: ${hydrated.preferredWindows.join(', ') || 'No preference'}`,
      '',
      hydrated.message,
      '',
      `${siteUrl}/admin/collections/booking-leads/${id}`,
    ]
      .filter((line): line is string => typeof line === 'string')
      .join('\n')

    const mail = {
      to: salesEmail,
      subject: subjects.bookingLeadSales(hydrated.serviceName, hydrated.name),
      html,
      text,
    }
    return () => sendEmail(mail)
  },

  sendVisitorDelivery: async ({ hydrated, salesEmail }) => {
    const html = await render(
      React.createElement(BookingLeadVisitor, {
        name: hydrated.name,
        service: hydrated.serviceName,
        locale: hydrated.locale,
        partnerName: 'Jakarta Business Center',
        partnerEmail: salesEmail,
      }),
    )
    const result = await sendEmail({
      to: hydrated.email,
      subject: subjects.bookingLeadVisitor[hydrated.locale],
      html,
      text:
        hydrated.locale === 'id'
          ? `Halo ${hydrated.name}, kami menerima permintaan konsultasi Anda untuk ${hydrated.serviceName}.`
          : `Hello ${hydrated.name}, we received your consultation request for ${hydrated.serviceName}.`,
    })
    return result.ok
  },
}

export async function submitBooking(formData: FormData): Promise<SubmitBookingResult> {
  const parsed = bookingSchema.safeParse(formDataToBookingObject(formData))
  if (!parsed.success) return { ok: false, code: 'validation' }
  if (parsed.data.hp)
    return { ok: true, submissionId: parsed.data.submissionId, delivery: 'pending' }

  return runSubmission(bookingPipeline, parsed.data)
}
