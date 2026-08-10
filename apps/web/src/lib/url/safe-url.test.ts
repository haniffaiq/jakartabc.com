import { describe, expect, it } from 'vitest'

import { safeHref } from './safe-url'

describe('safeHref', () => {
  it.each([
    ['/id/services', '/id/services'],
    ['/id/services?from=home#overview', '/id/services?from=home#overview'],
    [' https://example.test/a ', 'https://example.test/a'],
    ['http://example.test/a', 'http://example.test/a'],
  ])('allows a supported web URL: %s', (value, expected) => {
    expect(safeHref(value)).toBe(expected)
  })

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,boom',
    '//evil.test',
    '\\\\evil.test',
    '/safe\\evil',
    '%6a%61vascript:alert(1)',
    '%256a%2561vascript%253Aalert(1)',
    'javascript%3Aalert(1)',
    'https%3A%2F%2Fevil.test',
    '/%E0%A4%A',
    '/safe\u0000path',
    '/safe%0apath',
    'relative/path',
    './relative/path',
    '#fragment',
    '?query=yes',
    'ftp://example.test/file',
    'https://',
  ])('rejects an unsafe or ambiguous URL: %s', (value) => {
    expect(safeHref(value)).toBeNull()
  })

  it('allows mail and telephone links only when explicitly enabled', () => {
    expect(safeHref('mailto:hello@example.test')).toBeNull()
    expect(safeHref('tel:+62215550100')).toBeNull()
    expect(safeHref('mailto:hello@example.test', { allowMailto: true })).toBe(
      'mailto:hello@example.test',
    )
    expect(safeHref('tel:+62215550100', { allowTel: true })).toBe('tel:+62215550100')
  })

  it('rejects non-string and empty values', () => {
    expect(safeHref(undefined)).toBeNull()
    expect(safeHref(null)).toBeNull()
    expect(safeHref(42)).toBeNull()
    expect(safeHref('   ')).toBeNull()
  })
})
