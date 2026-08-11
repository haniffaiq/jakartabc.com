import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import {
  type DeliveryClaimDatabase,
  DeliveryClaimUnavailableError,
  claimInitialDeliveryAttempt,
} from './deliveryClaim'

type Statement = { text: string; values: unknown[] }

const contactId = '11111111-1111-4111-8111-111111111111'
const bookingId = '22222222-2222-4222-8222-222222222222'
const attemptedAt = new Date('2026-08-11T01:02:03.456Z')

const payloadPoolAsClaimDatabase = (payload: Payload): DeliveryClaimDatabase => payload.db.pool
void payloadPoolAsClaimDatabase

function databaseReturning(result: unknown) {
  return { query: vi.fn(async (_statement: Statement) => result) }
}

function claimedResult(id: number, submissionId: string) {
  return { rowCount: 1, rows: [{ id, submissionId }] }
}

describe('initial PostgreSQL delivery claim', () => {
  it.each([
    ['contact-messages', '"public"."contact_messages"', 17, contactId],
    ['booking-leads', '"public"."booking_leads"', 29, bookingId],
  ] as const)(
    'uses one fixed, parameterized CAS statement for %s',
    async (collection, table, id, submissionId) => {
      const database = databaseReturning(claimedResult(id, submissionId))

      const result = await claimInitialDeliveryAttempt({
        database,
        collection,
        id,
        submissionId,
        attemptedAt,
      })

      expect(result).toEqual({
        state: 'claimed',
        pending: {
          deliveryStatus: 'pending',
          deliveryAttempts: 1,
          lastDeliveryAttemptAt: attemptedAt.toISOString(),
          deliveredAt: null,
          deliveryError: null,
        },
      })
      expect(Object.isFrozen(result)).toBe(true)
      if (result.state !== 'claimed') throw new Error('expected claimed result')
      expect(Object.isFrozen(result.pending)).toBe(true)

      expect(database.query).toHaveBeenCalledOnce()
      const statement = database.query.mock.calls[0]?.[0]
      expect(statement?.text).toContain(`UPDATE ${table}`)
      expect(statement?.text).toMatch(/SET\s+"delivery_status" = 'pending'/)
      expect(statement?.text).toMatch(/"delivery_attempts" = 1/)
      expect(statement?.text).toMatch(/"last_delivery_attempt_at" = \$3/)
      expect(statement?.text).toMatch(/"updated_at" = \$3/)
      expect(statement?.text).toMatch(/WHERE\s+"id" = \$1/)
      expect(statement?.text).toMatch(/"submission_id" = \$2/)
      expect(statement?.text).toMatch(/"delivery_status" = 'pending'/)
      expect(statement?.text).toMatch(/"delivery_attempts" = 0/)
      expect(statement?.text).toMatch(/RETURNING\s+"id",\s+"submission_id" AS "submissionId"/)
      expect(statement?.text).not.toContain(submissionId)
      expect(statement?.text).not.toMatch(/locale/i)
      expect(statement?.values).toEqual([id, submissionId, attemptedAt.toISOString()])
    },
  )

  it('allows exactly one concurrent claimant for the untouched row', async () => {
    let untouched = true
    const database = {
      query: vi.fn(async (statement: Statement) => {
        await Promise.resolve()
        if (!untouched) return { rowCount: 0, rows: [] }
        untouched = false
        return claimedResult(statement.values[0] as number, statement.values[1] as string)
      }),
    }

    const results = await Promise.all([
      claimInitialDeliveryAttempt({
        database,
        collection: 'contact-messages',
        id: 17,
        submissionId: contactId,
        attemptedAt,
      }),
      claimInitialDeliveryAttempt({
        database,
        collection: 'contact-messages',
        id: 17,
        submissionId: contactId,
        attemptedAt,
      }),
    ])

    expect(results.filter(({ state }) => state === 'claimed')).toHaveLength(1)
    expect(results.filter(({ state }) => state === 'not-claimed')).toHaveLength(1)
  })

  it('returns a frozen non-error result when no untouched row matches', async () => {
    const database = databaseReturning({ rowCount: 0, rows: [] })

    const result = await claimInitialDeliveryAttempt({
      database,
      collection: 'contact-messages',
      id: 17,
      submissionId: contactId,
      attemptedAt,
    })

    expect(result).toEqual({ state: 'not-claimed' })
    expect(Object.isFrozen(result)).toBe(true)
  })

  it.each([
    null,
    undefined,
    false,
    { rowCount: null, rows: [] },
    { rowCount: '1', rows: [{ id: 17, submissionId: contactId }] },
    { rowCount: 1, rows: [] },
    { rowCount: 0, rows: [{ id: 17, submissionId: contactId }] },
    { rowCount: 2, rows: [{ id: 17, submissionId: contactId }] },
    { rowCount: 1, rows: [{ id: 99, submissionId: contactId }] },
    { rowCount: 1, rows: [{ id: 17, submissionId: bookingId }] },
  ])('fails closed for malformed query result %#', async (queryResult) => {
    const database = databaseReturning(queryResult)

    await expect(
      claimInitialDeliveryAttempt({
        database,
        collection: 'contact-messages',
        id: 17,
        submissionId: contactId,
        attemptedAt,
      }),
    ).rejects.toMatchObject({
      name: 'DeliveryClaimUnavailableError',
      message: 'Delivery claim is unavailable',
    })
  })

  it('fails closed for hostile result getters without leaking their error', async () => {
    const database = databaseReturning(
      Object.defineProperty({}, 'rowCount', {
        get() {
          throw new Error('postgres://user:secret@db/private')
        },
      }),
    )

    const claim = claimInitialDeliveryAttempt({
      database,
      collection: 'booking-leads',
      id: 29,
      submissionId: bookingId,
      attemptedAt,
    })

    await expect(claim).rejects.toBeInstanceOf(DeliveryClaimUnavailableError)
    await expect(claim).rejects.not.toThrow(/user:secret|private/)
  })

  it('fails closed with a stable error when PostgreSQL rejects', async () => {
    const database = {
      query: vi.fn().mockRejectedValue(new Error('postgres://user:secret@db/private')),
    }

    const claim = claimInitialDeliveryAttempt({
      database,
      collection: 'contact-messages',
      id: 17,
      submissionId: contactId,
      attemptedAt,
    })

    await expect(claim).rejects.toMatchObject({
      name: 'DeliveryClaimUnavailableError',
      message: 'Delivery claim is unavailable',
    })
    await expect(claim).rejects.not.toThrow(/user:secret|private/)
  })

  it.each([
    ['zero document id', { id: 0 }],
    ['negative document id', { id: -1 }],
    ['fractional document id', { id: 1.5 }],
    ['string document id', { id: '17' }],
    ['malformed submission id', { submissionId: "x'; DROP TABLE contact_messages; --" }],
    ['invalid date', { attemptedAt: new Date(Number.NaN) }],
    ['unknown collection', { collection: 'contact_messages' }],
  ])('rejects %s before querying', async (_case, invalid) => {
    const database = databaseReturning(claimedResult(17, contactId))

    await expect(
      claimInitialDeliveryAttempt({
        database,
        collection: 'contact-messages',
        id: 17,
        submissionId: contactId,
        attemptedAt,
        ...invalid,
      } as never),
    ).rejects.toBeInstanceOf(DeliveryClaimUnavailableError)

    expect(database.query).not.toHaveBeenCalled()
  })

  it('rejects hostile input getters before querying and sanitizes the error', async () => {
    const database = databaseReturning(claimedResult(17, contactId))
    const input = {
      database,
      collection: 'contact-messages',
      submissionId: contactId,
      attemptedAt,
    } as Record<string, unknown>
    Object.defineProperty(input, 'id', {
      get() {
        throw new Error('credential-bearing hostile getter')
      },
    })

    const claim = claimInitialDeliveryAttempt(input as never)

    await expect(claim).rejects.toBeInstanceOf(DeliveryClaimUnavailableError)
    await expect(claim).rejects.not.toThrow(/credential-bearing|hostile getter/)
    expect(database.query).not.toHaveBeenCalled()
  })
})
