import { describe, expect, it } from 'vitest'

import { bookingSchema } from './booking'

describe('bookingSchema', () => {
  const valid = {
    submissionId: '11111111-1111-4111-8111-111111111111',
    name: 'Maria',
    email: 'm@t.co',
    company: 'Solstice',
    phone: '',
    serviceSlug: 'pt-pma-setup',
    preferredWindows: ['mon-am'],
    message: 'Hello, I would like to set up a PT PMA.',
    locale: 'en',
    hp: '',
    turnstileToken: 'tok_xyz',
  }

  it('parses valid input', () => {
    expect(() => bookingSchema.parse(valid)).not.toThrow()
  })

  it('rejects bad email', () => {
    expect(() => bookingSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects missing serviceSlug', () => {
    expect(() => bookingSchema.parse({ ...valid, serviceSlug: '' })).toThrow()
  })

  it('requires message ≥10 chars', () => {
    expect(() => bookingSchema.parse({ ...valid, message: 'short' })).toThrow()
  })

  it('rejects invalid preferredWindows value', () => {
    expect(() =>
      bookingSchema.parse({ ...valid, preferredWindows: ['sat-am'] as unknown }),
    ).toThrow()
  })

  it('treats hp non-empty as honeypot trigger (parse OK, server rejects)', () => {
    expect(() => bookingSchema.parse({ ...valid, hp: 'spam' })).not.toThrow()
  })

  it('requires a UUID submissionId', () => {
    const missingSubmissionId: Partial<typeof valid> = { ...valid }
    delete missingSubmissionId.submissionId

    expect(bookingSchema.safeParse(missingSubmissionId).success).toBe(false)
    expect(bookingSchema.safeParse({ ...valid, submissionId: 'not-a-uuid' }).success).toBe(false)
    expect(bookingSchema.safeParse({ ...valid, submissionId: 'reused-booking-id' }).success).toBe(
      false,
    )
  })
})
