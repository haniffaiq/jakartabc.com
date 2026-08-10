import { describe, expect, it } from 'vitest'
import { Footer, isSafeFooterHref } from './Footer'

describe('Footer global', () => {
  it('has address/email/licenses/legal links fields and the site revalidate hook', () => {
    expect(Footer.slug).toBe('footer')

    const fields = Footer.fields as Array<{
      name?: string
      localized?: boolean
      type?: string
      fields?: Array<{ name?: string; validate?: unknown }>
    }>
    const names = fields.map((field) => field.name)
    expect(names).toEqual(
      expect.arrayContaining(['address', 'email', 'licenses', 'legalLinks', 'notice']),
    )
    expect(fields.find((field) => field.name === 'address')).toMatchObject({
      type: 'array',
      localized: true,
    })
    expect(fields.find((field) => field.name === 'licenses')).toMatchObject({
      type: 'array',
      localized: true,
    })
    expect(fields.find((field) => field.name === 'notice')).toMatchObject({
      type: 'richText',
      localized: true,
    })
    expect(Footer.hooks?.afterChange).toHaveLength(1)
  })

  it('restricts legal link hrefs to relative, http(s), and mailto URLs', () => {
    expect(isSafeFooterHref('/privacy')).toBe(true)
    expect(isSafeFooterHref(' /privacy ')).toBe(true)
    expect(isSafeFooterHref('https://example.com/privacy')).toBe(true)
    expect(isSafeFooterHref('http://example.com/privacy')).toBe(true)
    expect(isSafeFooterHref('mailto:hello@example.com')).toBe(true)
    expect(isSafeFooterHref('//evil.example')).toBeTypeOf('string')
    expect(isSafeFooterHref('/\\\\evil.example')).toBeTypeOf('string')
    expect(isSafeFooterHref('/\\evil.example')).toBeTypeOf('string')
    expect(isSafeFooterHref('javascript:alert(1)')).toBeTypeOf('string')
    expect(isSafeFooterHref('data:text/html,hi')).toBeTypeOf('string')
  })
})
