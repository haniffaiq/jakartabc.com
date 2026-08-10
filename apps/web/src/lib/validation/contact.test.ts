import { describe, expect, it } from 'vitest'

import { contactSchema } from './contact'

describe('contactSchema', () => {
  const valid = {
    submissionId: '11111111-1111-4111-8111-111111111111',
    name: 'Sari',
    email: 's@x.co',
    company: '',
    message: 'A reasonable message length.',
    locale: 'id',
    hp: '',
    turnstileToken: 'tok',
  }

  it('parses valid input', () => {
    expect(() => contactSchema.parse(valid)).not.toThrow()
  })

  it('requires message length of at least 10 characters', () => {
    expect(() => contactSchema.parse({ ...valid, message: 'no' })).toThrow()
  })

  it('requires a UUID submissionId', () => {
    const missingSubmissionId: Partial<typeof valid> = { ...valid }
    delete missingSubmissionId.submissionId

    expect(contactSchema.safeParse(missingSubmissionId).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, submissionId: 'not-a-uuid' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, submissionId: 'reused-contact-id' }).success).toBe(
      false,
    )
  })
})
