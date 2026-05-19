import { describe, expect, it } from 'vitest'

import { bookingSchema } from './booking'

describe('bookingSchema', () => {
  const valid = {
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
    expect(() => bookingSchema.parse({ ...valid, preferredWindows: ['sat-am'] as unknown })).toThrow()
  })

  it('treats hp non-empty as honeypot trigger (parse OK, server rejects)', () => {
    expect(() => bookingSchema.parse({ ...valid, hp: 'spam' })).not.toThrow()
  })
})
