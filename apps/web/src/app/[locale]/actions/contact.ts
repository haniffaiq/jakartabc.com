'use server'

import { render } from '@react-email/components'
import { headers } from 'next/headers'
import * as React from 'react'
import { ContactSales, ContactVisitor, sendEmail, subjects } from '@jakartabc/email'

import { submissionCoordinator, type SubmissionLease } from '@/lib/anti-spam/idempotency'
import { verifyTurnstile } from '@/lib/anti-spam/turnstile'
import { getPayloadClient } from '@/lib/payload'
import { getClientIP } from '@/lib/request/client-ip'
import {
  attemptDelivery,
  beginDeliveryAttempt,
  type DeliveryAttemptResult,
  type DeliveryStatus,
  type PendingDeliveryTransition,
} from '@/lib/submissions/delivery'
import { contactSchema } from '@/lib/validation/contact'

export type SubmitResult =
  | { ok: true }
  | {
      ok: true
      submissionId: string
      delivery: DeliveryStatus
    }
  | {
      ok: false
      code:
        | 'validation'
        | 'captcha'
        | 'rate'
        | 'persistence'
        | 'temporarily-unavailable'
        | 'unknown'
    }

type ContactDocument = {
  id: string | number
  submissionId?: string | null
  deliveryStatus?: DeliveryStatus | null
  deliveryAttempts?: number | null
  lastDeliveryAttemptAt?: string | null
  deliveredAt?: string | null
  deliveryError?: string | null
}

type ContactPayloadClient = {
  create: (args: {
    collection: 'contact-messages'
    data: Record<string, unknown>
    overrideAccess: true
  }) => Promise<ContactDocument>
  find: (args: {
    collection: 'contact-messages'
    limit: 1
    overrideAccess: true
    where: { submissionId: { equals: string } }
  }) => Promise<{ docs: ContactDocument[] }>
  update: (args: {
    collection: 'contact-messages'
    id: string | number
    data: Record<string, unknown>
    overrideAccess: true
  }) => Promise<ContactDocument>
}

function optionalCompany(company: string | undefined) {
  const trimmed = company?.trim() ?? ''
  return trimmed ? trimmed : undefined
}

function logEvent(level: 'error' | 'warn', event: string, submissionId?: string) {
  console[level]('[contact]', submissionId ? { event, submissionId } : { event })
}

function persistedDelivery(document: ContactDocument): DeliveryStatus {
  if (
    document.deliveryStatus === 'pending' ||
    document.deliveryStatus === 'sent' ||
    document.deliveryStatus === 'failed'
  ) {
    return document.deliveryStatus
  }
  throw new Error('Invalid persisted delivery state')
}

function isUntouchedPending(document: ContactDocument) {
  return document.deliveryStatus === 'pending' && document.deliveryAttempts === 0
}

function samePendingTransition(
  persisted: PendingDeliveryTransition,
  attempted: PendingDeliveryTransition,
) {
  return (
    persisted.deliveryStatus === attempted.deliveryStatus &&
    persisted.deliveryAttempts === attempted.deliveryAttempts &&
    persisted.lastDeliveryAttemptAt === attempted.lastDeliveryAttemptAt &&
    persisted.deliveredAt === attempted.deliveredAt &&
    persisted.deliveryError === attempted.deliveryError
  )
}

function sameFinalTransition(persisted: ContactDocument, expected: DeliveryAttemptResult['final']) {
  return (
    persisted.deliveryStatus === expected.deliveryStatus &&
    persisted.deliveryAttempts === expected.deliveryAttempts &&
    persisted.lastDeliveryAttemptAt === expected.lastDeliveryAttemptAt &&
    persisted.deliveredAt === expected.deliveredAt &&
    persisted.deliveryError === expected.deliveryError
  )
}

async function findBySubmissionId(payload: ContactPayloadClient, submissionId: string) {
  const result = await payload.find({
    collection: 'contact-messages',
    limit: 1,
    overrideAccess: true,
    where: { submissionId: { equals: submissionId } },
  })
  return result.docs[0]
}

async function releaseLease(lease: SubmissionLease) {
  try {
    const result = await submissionCoordinator.release(lease)
    if (result.state !== 'released') {
      logEvent('warn', 'submission-lease-release-lost', lease.submissionId)
    }
  } catch {
    logEvent('error', 'submission-lease-release-failed', lease.submissionId)
  }
}

async function completeLease(lease: SubmissionLease) {
  try {
    const result = await submissionCoordinator.complete(lease)
    if (result.state === 'completed') return true
    logEvent('warn', 'submission-lease-completion-lost', lease.submissionId)
  } catch {
    logEvent('error', 'submission-lease-completion-failed', lease.submissionId)
  }
  await releaseLease(lease)
  return false
}

async function completeExisting(
  document: ContactDocument,
  submissionId: string,
  lease?: SubmissionLease,
): Promise<SubmitResult> {
  let delivery: DeliveryStatus
  try {
    delivery = persistedDelivery(document)
  } catch {
    if (lease) await releaseLease(lease)
    logEvent('error', 'persisted-delivery-state-invalid', submissionId)
    return { ok: false, code: 'persistence' }
  }

  if (lease && !(await completeLease(lease))) {
    return { ok: false, code: 'temporarily-unavailable' }
  }

  return { ok: true, submissionId, delivery }
}

export async function submitContact(formData: FormData, _ip?: string): Promise<SubmitResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { ok: false, code: 'validation' }

  const data = parsed.data
  if (data.hp) return { ok: true }

  const salesEmail = process.env.SALES_EMAIL
  if (!salesEmail) return { ok: false, code: 'unknown' }

  let ip: string
  try {
    ip = getClientIP(await headers())
  } catch {
    logEvent('error', 'trusted-client-identity-failed', data.submissionId)
    return { ok: false, code: 'temporarily-unavailable' }
  }

  try {
    if (!(await verifyTurnstile(data.turnstileToken, ip))) {
      return { ok: false, code: 'captcha' }
    }
  } catch {
    logEvent('error', 'turnstile-provider-failed', data.submissionId)
    return { ok: false, code: 'temporarily-unavailable' }
  }

  try {
    const rate = await submissionCoordinator.rateLimit('contact', `${ip}:${data.email}`)
    if (!rate.allowed) return { ok: false, code: 'rate' }
  } catch {
    logEvent('error', 'rate-limit-provider-failed', data.submissionId)
    return { ok: false, code: 'temporarily-unavailable' }
  }

  let acquired: Awaited<ReturnType<typeof submissionCoordinator.acquire>>
  try {
    acquired = await submissionCoordinator.acquire(data.submissionId)
  } catch {
    logEvent('error', 'submission-lease-acquire-failed', data.submissionId)
    return { ok: false, code: 'temporarily-unavailable' }
  }

  if (acquired.state === 'in-progress') {
    return { ok: false, code: 'temporarily-unavailable' }
  }

  let payload: ContactPayloadClient
  try {
    payload = (await getPayloadClient()) as unknown as ContactPayloadClient
  } catch {
    if (acquired.state === 'acquired') await releaseLease(acquired.lease)
    logEvent('error', 'payload-client-unavailable', data.submissionId)
    return { ok: false, code: 'persistence' }
  }

  if (acquired.state === 'completed') {
    try {
      const existing = await findBySubmissionId(payload, data.submissionId)
      if (!existing) {
        logEvent('error', 'completed-submission-missing', data.submissionId)
        return { ok: false, code: 'persistence' }
      }
      return completeExisting(existing, data.submissionId)
    } catch {
      logEvent('error', 'completed-submission-read-failed', data.submissionId)
      return { ok: false, code: 'persistence' }
    }
  }

  const { lease } = acquired
  let existing: ContactDocument | undefined
  try {
    existing = await findBySubmissionId(payload, data.submissionId)
  } catch {
    await releaseLease(lease)
    logEvent('error', 'submission-reconciliation-read-failed', data.submissionId)
    return { ok: false, code: 'persistence' }
  }

  const company = optionalCompany(data.company)
  let document: ContactDocument
  if (existing) {
    if (!isUntouchedPending(existing)) {
      return completeExisting(existing, data.submissionId, lease)
    }
    document = existing
  } else {
    try {
      document = await payload.create({
        collection: 'contact-messages',
        overrideAccess: true,
        data: {
          submissionId: data.submissionId,
          deliveryStatus: 'pending',
          deliveryAttempts: 0,
          name: data.name,
          email: data.email,
          company,
          message: data.message,
          locale: data.locale,
          status: 'new',
        },
      })
    } catch {
      try {
        existing = await findBySubmissionId(payload, data.submissionId)
      } catch {
        await releaseLease(lease)
        logEvent('error', 'submission-create-reconciliation-failed', data.submissionId)
        return { ok: false, code: 'persistence' }
      }

      if (existing) {
        if (!isUntouchedPending(existing)) {
          return completeExisting(existing, data.submissionId, lease)
        }
        document = existing
      } else {
        await releaseLease(lease)
        logEvent('error', 'submission-create-failed', data.submissionId)
        return { ok: false, code: 'persistence' }
      }
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jakartabc.com'
  const currentAttempts = document.deliveryAttempts ?? 0
  const attemptedAt = new Date()
  let pending: PendingDeliveryTransition
  try {
    pending = beginDeliveryAttempt(currentAttempts, attemptedAt)
    document = await payload.update({
      collection: 'contact-messages',
      id: document.id,
      overrideAccess: true,
      data: pending,
    })
  } catch {
    await releaseLease(lease)
    logEvent('error', 'delivery-pending-update-failed', data.submissionId)
    return { ok: false, code: 'persistence' }
  }

  let ownerAttempt: Awaited<ReturnType<typeof attemptDelivery>>
  try {
    let initialClockRead = true
    ownerAttempt = await attemptDelivery({
      currentAttempts,
      clock: () => {
        if (initialClockRead) {
          initialClockRead = false
          return attemptedAt
        }
        return new Date()
      },
      send: async () => {
        const salesHtml = await render(
          React.createElement(ContactSales, {
            messageId: document.id,
            name: data.name,
            email: data.email,
            company,
            message: data.message,
            locale: data.locale,
            siteUrl,
          }),
        )
        return sendEmail({
          to: salesEmail,
          subject: subjects.contactSales(data.name),
          html: salesHtml,
          text: `${data.name} <${data.email}>${company ? `\n${company}` : ''}\n\n${data.message}`,
        })
      },
    })
    if (!samePendingTransition(pending, ownerAttempt.pending)) {
      throw new Error('Delivery pending transition diverged')
    }
  } catch {
    await releaseLease(lease)
    logEvent('error', 'owner-delivery-transition-failed', data.submissionId)
    return { ok: false, code: 'persistence' }
  }

  try {
    document = await payload.update({
      collection: 'contact-messages',
      id: document.id,
      overrideAccess: true,
      data: ownerAttempt.final,
    })
    if (!sameFinalTransition(document, ownerAttempt.final)) {
      throw new Error('Delivery final transition was not persisted')
    }
  } catch {
    await releaseLease(lease)
    logEvent('error', 'delivery-state-update-failed', data.submissionId)
    return { ok: false, code: 'persistence' }
  }

  try {
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
    if (!visitorResult.ok) {
      logEvent('warn', 'visitor-confirmation-failed', data.submissionId)
    }
  } catch {
    logEvent('warn', 'visitor-confirmation-failed', data.submissionId)
  }

  if (!(await completeLease(lease))) {
    return { ok: false, code: 'temporarily-unavailable' }
  }

  return {
    ok: true,
    submissionId: data.submissionId,
    delivery: persistedDelivery(document),
  }
}
