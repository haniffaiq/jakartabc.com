import { headers } from 'next/headers'

import { submissionCoordinator, type SubmissionLease } from '@/lib/anti-spam/idempotency'
import type { RateLimitScope } from '@/lib/anti-spam/rate-limit'
import { verifyTurnstile } from '@/lib/anti-spam/turnstile'
import { getPayloadClient } from '@/lib/payload'
import { getClientIP } from '@/lib/request/client-ip'
import type { SendResult } from '@jakartabc/email'

import {
  attemptDelivery,
  reconcilePersistedDelivery,
  type DeliveryStatus,
  type PendingDeliveryTransition,
} from './delivery'
import {
  claimInitialDeliveryAttempt,
  type DeliveryClaimCollection,
  type DeliveryClaimDatabase,
} from './deliveryClaim'

/**
 * Every failure point of the submission flow, so an action can decide which
 * public error code each one maps to without re-implementing the flow.
 */
export type SubmissionStage =
  | 'sales-email-missing'
  | 'client-identity'
  | 'captcha-provider'
  | 'rate-limit-provider'
  | 'lease-acquire'
  | 'lease-in-progress'
  | 'lease-release'
  | 'lease-renew'
  | 'lease-complete'
  | 'payload-client'
  | 'completed-read'
  | 'completed-missing'
  | 'completed-invalid'
  | 'reconcile-invalid'
  | 'submission-read'
  | 'submission-create'
  | 'submission-create-read'
  | 'identity-invalid'
  | 'hydrate'
  | 'owner-mail-prepare'
  | 'delivery-claim'
  | 'delivery-claim-read'
  | 'delivery-claim-missing'
  | 'delivery-transition'
  | 'delivery-persist'

export type SubmissionDocument = {
  id: unknown
  submissionId?: unknown
  deliveryStatus?: unknown
  deliveryAttempts?: unknown
  lastDeliveryAttemptAt?: unknown
  deliveredAt?: unknown
  deliveryError?: unknown
  [field: string]: unknown
}

export type SubmissionPayloadClient = {
  db: { pool: DeliveryClaimDatabase }
  find(args: Record<string, unknown>): Promise<{ docs: SubmissionDocument[] }>
  create(args: Record<string, unknown>): Promise<SubmissionDocument>
  update(args: Record<string, unknown>): Promise<SubmissionDocument>
}

export type SubmissionCreatePlan<Code extends string> =
  /** Row may be written with `data` plus any collection-specific `args`. */
  | { state: 'ready'; data: Record<string, unknown>; args?: Record<string, unknown> }
  /** The request is well-formed but refers to something that does not exist. */
  | { state: 'rejected'; code: Code }
  /** A dependency needed to build the row was unreachable. */
  | { state: 'unavailable' }

export type SubmissionInput = {
  submissionId: string
  email: string
  turnstileToken: string
}

export type SubmissionPipeline<Input extends SubmissionInput, Hydrated, Code extends string> = {
  /** Log prefix, e.g. `contact`. */
  name: string
  collection: DeliveryClaimCollection
  rateLimitScope: RateLimitScope
  /** Public error code for each failure point. */
  failureCode: (stage: SubmissionStage) => Code
  /** Codes for the two rejections that are answers, not failures. */
  rejectionCodes: { captcha: Code; rate: Code }
  /** Arguments for the `submissionId` lookup, minus the collection. */
  findArgs: (submissionId: string) => Record<string, unknown>
  prepareCreate: (context: {
    input: Input
    payload: SubmissionPayloadClient
  }) => Promise<SubmissionCreatePlan<Code>>
  /** Re-read the row after creating it (needed when create cannot return joins). */
  readAfterCreate: boolean
  /** Reject persisted rows that cannot be trusted to build the owner email. */
  hydrate: (document: SubmissionDocument) => Hydrated | null
  prepareOwnerDelivery: (context: {
    hydrated: Hydrated
    id: number
    salesEmail: string
    siteUrl: string
  }) => Promise<() => Promise<SendResult>>
  sendVisitorDelivery: (context: { hydrated: Hydrated; salesEmail: string }) => Promise<boolean>
}

export type SubmissionResult<Code extends string> =
  | { ok: true; submissionId: string; delivery: DeliveryStatus }
  | { ok: false; code: Code }

const DEFAULT_SITE_URL = 'https://jakartabc.com'

function isUntouchedPending(document: SubmissionDocument) {
  return (
    document.deliveryStatus === 'pending' &&
    document.deliveryAttempts === 0 &&
    document.lastDeliveryAttemptAt === null &&
    document.deliveredAt === null &&
    document.deliveryError === null
  )
}

function sameTransition(persisted: Record<string, unknown>, expected: Record<string, unknown>) {
  return (
    persisted.deliveryStatus === expected.deliveryStatus &&
    persisted.deliveryAttempts === expected.deliveryAttempts &&
    persisted.lastDeliveryAttemptAt === expected.lastDeliveryAttemptAt &&
    persisted.deliveredAt === expected.deliveredAt &&
    persisted.deliveryError === expected.deliveryError
  )
}

function persistedId(document: SubmissionDocument, submissionId: string) {
  const id = document.id
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return null
  return document.submissionId === submissionId ? id : null
}

/**
 * Runs the durable submission flow shared by every public form:
 * anti-spam -> single-writer lease -> idempotent row -> atomic delivery claim
 * -> owner email -> durable delivery state -> best-effort visitor email.
 *
 * Only the collection-specific pieces come from `pipeline`; the ordering and
 * the fail-closed rules live here so a fix lands once for every form.
 */
export async function runSubmission<Input extends SubmissionInput, Hydrated, Code extends string>(
  pipeline: SubmissionPipeline<Input, Hydrated, Code>,
  input: Input,
): Promise<SubmissionResult<Code>> {
  const collection = pipeline.collection
  const submissionId = input.submissionId

  function log(level: 'error' | 'warn', event: string) {
    console[level](`[${pipeline.name}] ${event}`, { submissionId })
  }

  function fail(stage: SubmissionStage): { ok: false; code: Code } {
    log('error', stage)
    return { ok: false, code: pipeline.failureCode(stage) }
  }

  function accept(delivery: DeliveryStatus): SubmissionResult<Code> {
    return { ok: true, submissionId, delivery }
  }

  async function release(lease: SubmissionLease) {
    try {
      if ((await submissionCoordinator.release(lease)).state === 'released') return true
      log('warn', 'lease-release-lost')
    } catch {
      log('error', 'lease-release-failed')
    }
    return false
  }

  async function renew(lease: SubmissionLease) {
    try {
      if ((await submissionCoordinator.renew(lease)).state === 'renewed') return true
      log('warn', 'lease-renew-lost')
    } catch {
      log('error', 'lease-renew-failed')
    }
    return false
  }

  async function complete(lease: SubmissionLease) {
    try {
      if ((await submissionCoordinator.complete(lease)).state === 'completed') return true
      log('warn', 'lease-complete-lost')
    } catch {
      log('error', 'lease-complete-failed')
    }
    await release(lease)
    return false
  }

  /** Abandon the attempt, releasing the lease first so a retry can resume. */
  async function abort(lease: SubmissionLease, stage: SubmissionStage) {
    await release(lease)
    return fail(stage)
  }

  /**
   * A row that already carries a delivery attempt is authoritative: report it
   * and never resend.
   */
  async function reportPersisted(
    document: SubmissionDocument,
    lease: SubmissionLease,
  ): Promise<SubmissionResult<Code>> {
    const reconciliation = reconcilePersistedDelivery(document)
    if (reconciliation.state === 'invalid') return abort(lease, 'reconcile-invalid')
    if (reconciliation.delivery === 'pending') log('warn', 'existing-delivery-pending')
    if (!(await complete(lease))) return fail('lease-complete')
    return accept(reconciliation.delivery)
  }

  const salesEmail = process.env.SALES_EMAIL
  if (!salesEmail) return fail('sales-email-missing')

  let ip: string
  try {
    ip = getClientIP(await headers())
  } catch {
    return fail('client-identity')
  }

  try {
    if (!(await verifyTurnstile(input.turnstileToken, ip))) {
      return { ok: false, code: pipeline.rejectionCodes.captcha }
    }
  } catch {
    return fail('captcha-provider')
  }

  try {
    const rate = await submissionCoordinator.rateLimit(
      pipeline.rateLimitScope,
      `${ip}:${input.email}`,
    )
    if (!rate.allowed) return { ok: false, code: pipeline.rejectionCodes.rate }
  } catch {
    return fail('rate-limit-provider')
  }

  let acquisition: Awaited<ReturnType<typeof submissionCoordinator.acquire>>
  try {
    acquisition = await submissionCoordinator.acquire(submissionId)
  } catch {
    return fail('lease-acquire')
  }
  if (acquisition.state === 'in-progress') return fail('lease-in-progress')

  let payload: SubmissionPayloadClient
  try {
    payload = (await getPayloadClient()) as unknown as SubmissionPayloadClient
  } catch {
    if (acquisition.state === 'acquired') await release(acquisition.lease)
    return fail('payload-client')
  }

  const findBySubmissionId = async () => {
    const result = await payload.find({ collection, ...pipeline.findArgs(submissionId) })
    return result.docs[0]
  }

  if (acquisition.state === 'completed') {
    let persisted: SubmissionDocument | undefined
    try {
      persisted = await findBySubmissionId()
    } catch {
      return fail('completed-read')
    }
    if (!persisted) return fail('completed-missing')
    const reconciliation = reconcilePersistedDelivery(persisted)
    return reconciliation.state === 'invalid'
      ? fail('completed-invalid')
      : accept(reconciliation.delivery)
  }

  const { lease } = acquisition

  let document: SubmissionDocument | undefined
  try {
    document = await findBySubmissionId()
  } catch {
    return abort(lease, 'submission-read')
  }
  if (document && !isUntouchedPending(document)) return reportPersisted(document, lease)

  if (!document) {
    const plan = await pipeline.prepareCreate({ input, payload })
    if (plan.state === 'unavailable') return abort(lease, 'submission-create-read')
    if (plan.state === 'rejected') {
      return (await release(lease)) ? { ok: false, code: plan.code } : fail('lease-release')
    }

    try {
      const created = await payload.create({
        collection,
        overrideAccess: true,
        ...plan.args,
        data: plan.data,
      })
      document = pipeline.readAfterCreate ? undefined : created
    } catch {
      // A unique-constraint race means another worker already wrote the row.
      let raced: SubmissionDocument | undefined
      try {
        raced = await findBySubmissionId()
      } catch {
        return abort(lease, 'submission-create-read')
      }
      if (!raced) return abort(lease, 'submission-create')
      if (!isUntouchedPending(raced)) return reportPersisted(raced, lease)
      document = raced
    }

    if (!document) {
      try {
        document = await findBySubmissionId()
      } catch {
        return abort(lease, 'submission-create-read')
      }
      if (!document) return abort(lease, 'submission-create')
    }
  }

  const id = persistedId(document, submissionId)
  if (id === null) return abort(lease, 'identity-invalid')

  const hydrated = pipeline.hydrate(document)
  if (!hydrated) return abort(lease, 'hydrate')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL
  let sendOwnerMail: () => Promise<SendResult>
  try {
    sendOwnerMail = await pipeline.prepareOwnerDelivery({ hydrated, id, salesEmail, siteUrl })
  } catch {
    return abort(lease, 'owner-mail-prepare')
  }

  // From here on the attempt is durably recorded before any email leaves, so a
  // crash can never turn into a silent resend.
  if (!(await renew(lease))) return abort(lease, 'lease-renew')

  const attemptedAt = new Date()
  let claimed: PendingDeliveryTransition
  try {
    const claim = await claimInitialDeliveryAttempt({
      database: payload.db.pool,
      collection,
      id,
      submissionId,
      attemptedAt,
    })
    if (claim.state === 'not-claimed') {
      let canonical: SubmissionDocument | undefined
      try {
        canonical = await findBySubmissionId()
      } catch {
        return abort(lease, 'delivery-claim-read')
      }
      if (!canonical) return abort(lease, 'delivery-claim-missing')
      return reportPersisted(canonical, lease)
    }
    claimed = claim.pending
  } catch {
    return abort(lease, 'delivery-claim')
  }

  if (!(await renew(lease))) return abort(lease, 'lease-renew')

  let firstClockRead = true
  const delivery = await attemptDelivery({
    currentAttempts: 0,
    clock: () => {
      if (firstClockRead) {
        firstClockRead = false
        return attemptedAt
      }
      return new Date()
    },
    send: sendOwnerMail,
  })
  if (!sameTransition(claimed, delivery.pending)) {
    return abort(lease, 'delivery-transition')
  }

  try {
    const persisted = await payload.update({
      collection,
      id,
      overrideAccess: true,
      data: delivery.final,
    })
    if (!sameTransition(persisted, delivery.final)) throw new Error('final state not persisted')
  } catch {
    return abort(lease, 'delivery-persist')
  }

  try {
    if (!(await pipeline.sendVisitorDelivery({ hydrated, salesEmail }))) {
      log('warn', 'visitor-delivery-failed')
    }
  } catch {
    log('warn', 'visitor-delivery-failed')
  }

  if (!(await complete(lease))) return fail('lease-complete')

  return accept(delivery.final.deliveryStatus)
}
