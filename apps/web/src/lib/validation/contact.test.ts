import { describe, expect, it } from 'vitest'

import { contactSchema } from './contact'

describe('contactSchema', () => {
  const valid = {
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
})
