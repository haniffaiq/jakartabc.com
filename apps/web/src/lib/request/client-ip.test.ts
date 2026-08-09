import { describe, expect, it } from 'vitest'

import { getClientIP } from './client-ip'

const secret = 'proxy-secret-value-that-is-at-least-32-characters'

function headers(values: Record<string, string | null>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null
    },
  }
}

describe('trusted client IP', () => {
  it('uses the first normalized forwarded address with an exact valid proxy proof', () => {
    const requestHeaders = headers({
      'x-jbc-proxy-secret': secret,
      'x-forwarded-for': ' 2001:0db8:0:0:0:0:0:1 , 198.51.100.4',
    })

    expect(getClientIP(requestHeaders, secret)).toBe('2001:db8::1')
  })

  it.each([null, 'wrong-secret', `${secret}-suffix`, secret.slice(1)])(
    'ignores forwarding headers when proxy proof is %s',
    (proof) => {
      const requestHeaders = headers({
        'x-jbc-proxy-secret': proof,
        'x-forwarded-for': '203.0.113.8',
        'x-real-ip': '203.0.113.9',
        'cf-connecting-ip': '203.0.113.10',
      })

      expect(getClientIP(requestHeaders, secret)).toBe('unknown')
    },
  )

  it.each([
    '203.0.113.8\n198.51.100.2',
    '203.0.113.8\r\n198.51.100.2',
    '203.0.113.8, not-an-ip',
    '203.0.113.8,',
    '203.0.113.8:443',
    '',
  ])('rejects malformed or multiline x-forwarded-for value %j', (forwarded) => {
    const requestHeaders = headers({
      'x-jbc-proxy-secret': secret,
      'x-forwarded-for': forwarded,
    })

    expect(getClientIP(requestHeaders, secret)).toBe('unknown')
  })

  it('never trusts cf-connecting-ip even with valid proxy proof', () => {
    const requestHeaders = headers({
      'x-jbc-proxy-secret': secret,
      'x-forwarded-for': null,
      'cf-connecting-ip': '203.0.113.10',
    })

    expect(getClientIP(requestHeaders, secret)).toBe('unknown')
  })
})
