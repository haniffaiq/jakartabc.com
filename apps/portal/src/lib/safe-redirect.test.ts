import { describe, expect, it } from 'vitest'

import { safeNextPath } from './safe-redirect'

describe('safeNextPath', () => {
  it.each([
    ['https://evil.test', '/dashboard'],
    ['http://evil.test', '/dashboard'],
    ['javascript:alert(1)', '/dashboard'],
    ['//evil.test', '/dashboard'],
    ['///evil.test', '/dashboard'],
    ['\\\\evil.test', '/dashboard'],
    ['/\\evil.test', '/dashboard'],
    ['/%2f%2fevil.test', '/dashboard'],
    ['/%252f%252fevil.test', '/dashboard'],
    ['/%5c%5cevil.test', '/dashboard'],
    ['/%255c%255cevil.test', '/dashboard'],
    ['/..//evil.test', '/dashboard'],
    ['/.//evil.test', '/dashboard'],
    ['/dashboard/..//evil.test', '/dashboard'],
    ['/%2e%2e//evil.test', '/dashboard'],
    ['/%252e%252e//evil.test', '/dashboard'],
    ['/%252e//evil.test', '/dashboard'],
    ['/dashboard%0d%0aLocation:https://evil.test', '/dashboard'],
    ['/dashboard%250d%250aLocation:https://evil.test', '/dashboard'],
    ['/%E0%A4%A', '/dashboard'],
    ['', '/dashboard'],
    ['/dashboard/invoices?year=2026', '/dashboard/invoices?year=2026'],
    ['/dashboard/cases/acme?tab=files#latest', '/dashboard/cases/acme?tab=files#latest'],
  ])('canonicalizes %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })

  it('uses dashboard when next is absent', () => {
    expect(safeNextPath(null)).toBe('/dashboard')
  })
})
