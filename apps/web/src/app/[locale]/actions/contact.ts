'use server'

import { render } from '@react-email/components'
import * as React from 'react'
import { ContactSales, ContactVisitor, sendEmail, subjects } from '@jakartabc/email'

import {
  runSubmission,
  type SubmissionDocument,
  type SubmissionPipeline,
  type SubmissionStage,
} from '@/lib/submissions/pipeline'
import { contactSchema, type ContactInput } from '@/lib/validation/contact'
import type { DeliveryStatus } from '@/lib/submissions/delivery'

export type SubmitResult =
  | { ok: true }
  | { ok: true; submissionId: string; delivery: DeliveryStatus }
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

type ContactFailureCode = Extract<SubmitResult, { ok: false }>['code']

/** Failures the caller can retry as-is; everything else is a durability fault. */
const RETRYABLE_STAGES = new Set<SubmissionStage>([
  'client-identity',
  'captcha-provider',
  'rate-limit-provider',
  'lease-acquire',
  'lease-in-progress',
  'lease-release',
  'lease-renew',
  'lease-complete',
])

const deliverySourceSchema = contactSchema.pick({
  name: true,
  email: true,
  company: true,
  message: true,
  locale: true,
})

type ContactMail = ReturnType<typeof deliverySourceSchema.parse>

function optionalCompany(company: string | undefined) {
  const trimmed = company?.trim() ?? ''
  return trimmed ? trimmed : undefined
}

const contactPipeline: SubmissionPipeline<ContactInput, ContactMail, ContactFailureCode> = {
  name: 'contact',
  collection: 'contact-messages',
  rateLimitScope: 'contact',
  readAfterCreate: false,
  rejectionCodes: { captcha: 'captcha', rate: 'rate' },

  failureCode: (stage) =>
    stage === 'sales-email-missing'
      ? 'unknown'
      : RETRYABLE_STAGES.has(stage)
        ? 'temporarily-unavailable'
        : 'persistence',

  findArgs: (submissionId) => ({
    limit: 1,
    overrideAccess: true,
    where: { submissionId: { equals: submissionId } },
  }),

  prepareCreate: async ({ input }) => ({
    state: 'ready',
    data: {
      submissionId: input.submissionId,
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
      name: input.name,
      email: input.email,
      company: optionalCompany(input.company),
      message: input.message,
      locale: input.locale,
      status: 'new',
    },
  }),

  hydrate: (document: SubmissionDocument) => {
    const parsed = deliverySourceSchema.safeParse({
      name: document.name,
      email: document.email,
      company: document.company ?? undefined,
      message: document.message,
      locale: document.locale,
    })
    return parsed.success ? parsed.data : null
  },

  prepareOwnerDelivery: async ({ hydrated, id, salesEmail, siteUrl }) => {
    const company = optionalCompany(hydrated.company)
    const html = await render(
      React.createElement(ContactSales, {
        messageId: id,
        name: hydrated.name,
        email: hydrated.email,
        company,
        message: hydrated.message,
        locale: hydrated.locale,
        siteUrl,
      }),
    )
    const mail = {
      to: salesEmail,
      subject: subjects.contactSales(hydrated.name),
      html,
      text: `${hydrated.name} <${hydrated.email}>${company ? `\n${company}` : ''}\n\n${hydrated.message}`,
    }
    return () => sendEmail(mail)
  },

  sendVisitorDelivery: async ({ hydrated }) => {
    const html = await render(
      React.createElement(ContactVisitor, {
        name: hydrated.name,
        locale: hydrated.locale,
        replyEmail: process.env.EMAIL_FROM ?? 'hello@jakartabc.com',
      }),
    )
    const result = await sendEmail({
      to: hydrated.email,
      subject: subjects.contactVisitor[hydrated.locale],
      html,
      text:
        hydrated.locale === 'id'
          ? `Halo ${hydrated.name},\n\nKami menerima pesan Anda dan akan membalas dalam 1 hari kerja. Bila mendesak, silakan kirim ke alamat di bawah.`
          : `Hi ${hydrated.name},\n\nWe received your message and will reply within one business day. If urgent, you can also write directly to the address below.`,
    })
    return result.ok
  },
}

export async function submitContact(formData: FormData, _ip?: string): Promise<SubmitResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { ok: false, code: 'validation' }
  if (parsed.data.hp) return { ok: true }

  return runSubmission(contactPipeline, parsed.data)
}
