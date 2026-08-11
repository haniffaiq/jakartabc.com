import { beginDeliveryAttempt, type PendingDeliveryTransition } from './delivery'

const CONTACT_INITIAL_CLAIM_SQL = `
UPDATE "public"."contact_messages"
SET
  "delivery_status" = 'pending',
  "delivery_attempts" = 1,
  "last_delivery_attempt_at" = $3,
  "delivered_at" = NULL,
  "delivery_error" = NULL,
  "updated_at" = $3
WHERE
  "id" = $1
  AND "submission_id" = $2
  AND "delivery_status" = 'pending'
  AND "delivery_attempts" = 0
  AND "last_delivery_attempt_at" IS NULL
  AND "delivered_at" IS NULL
  AND "delivery_error" IS NULL
RETURNING "id", "submission_id" AS "submissionId"
`

const BOOKING_INITIAL_CLAIM_SQL = `
UPDATE "public"."booking_leads"
SET
  "delivery_status" = 'pending',
  "delivery_attempts" = 1,
  "last_delivery_attempt_at" = $3,
  "delivered_at" = NULL,
  "delivery_error" = NULL,
  "updated_at" = $3
WHERE
  "id" = $1
  AND "submission_id" = $2
  AND "delivery_status" = 'pending'
  AND "delivery_attempts" = 0
  AND "last_delivery_attempt_at" IS NULL
  AND "delivered_at" IS NULL
  AND "delivery_error" IS NULL
RETURNING "id", "submission_id" AS "submissionId"
`

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const NOT_CLAIMED = Object.freeze({ state: 'not-claimed' } as const)

export type DeliveryClaimCollection = 'contact-messages' | 'booking-leads'

type DeliveryClaimStatement = {
  text: string
  values: [number, string, string]
}

export type DeliveryClaimDatabase = {
  query(statement: DeliveryClaimStatement): Promise<unknown>
}

export type InitialDeliveryClaimResult =
  | Readonly<{ state: 'claimed'; pending: PendingDeliveryTransition }>
  | typeof NOT_CLAIMED

export class DeliveryClaimUnavailableError extends Error {
  override readonly name = 'DeliveryClaimUnavailableError'

  constructor() {
    super('Delivery claim is unavailable')
  }
}

function statementFor(collection: DeliveryClaimCollection) {
  switch (collection) {
    case 'contact-messages':
      return CONTACT_INITIAL_CLAIM_SQL
    case 'booking-leads':
      return BOOKING_INITIAL_CLAIM_SQL
    default:
      throw new DeliveryClaimUnavailableError()
  }
}

function parseResult(
  rawResult: unknown,
  expectedId: number,
  expectedSubmissionId: string,
  pending: PendingDeliveryTransition,
): InitialDeliveryClaimResult {
  if (typeof rawResult !== 'object' || rawResult === null) {
    throw new DeliveryClaimUnavailableError()
  }

  const rowCount = Reflect.get(rawResult, 'rowCount')
  const rows = Reflect.get(rawResult, 'rows')
  if (!Array.isArray(rows)) throw new DeliveryClaimUnavailableError()

  if (rowCount === 0 && rows.length === 0) return NOT_CLAIMED
  if (rowCount !== 1 || rows.length !== 1) throw new DeliveryClaimUnavailableError()

  const row = rows[0]
  if (
    typeof row !== 'object' ||
    row === null ||
    Reflect.get(row, 'id') !== expectedId ||
    Reflect.get(row, 'submissionId') !== expectedSubmissionId
  ) {
    throw new DeliveryClaimUnavailableError()
  }

  return Object.freeze({ state: 'claimed', pending })
}

export async function claimInitialDeliveryAttempt(input: {
  database: DeliveryClaimDatabase
  collection: DeliveryClaimCollection
  id: number
  submissionId: string
  attemptedAt: Date
}): Promise<InitialDeliveryClaimResult> {
  try {
    const database = input.database
    const collection = input.collection
    const id = input.id
    const submissionId = input.submissionId
    const attemptedAt = input.attemptedAt

    if (!Number.isSafeInteger(id) || id <= 0) throw new DeliveryClaimUnavailableError()
    if (typeof submissionId !== 'string' || !UUID_PATTERN.test(submissionId)) {
      throw new DeliveryClaimUnavailableError()
    }

    const text = statementFor(collection)
    const pending = beginDeliveryAttempt(0, attemptedAt)
    const rawResult = await database.query({
      text,
      values: [id, submissionId, pending.lastDeliveryAttemptAt],
    })

    return parseResult(rawResult, id, submissionId, pending)
  } catch {
    throw new DeliveryClaimUnavailableError()
  }
}
