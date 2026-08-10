import { describe, expect, it } from 'vitest'

import { Services } from './Services'

const request = (role?: 'admin' | 'editor' | 'client') => ({
  req: { user: role ? { role } : null },
})

describe('Services collection', () => {
  it('has expected top-level fields', () => {
    const names = (Services.fields as { name?: string }[]).map((field) => field.name)

    expect(names).toEqual(
      expect.arrayContaining([
        'slug',
        'order',
        'name',
        'timelineLabel',
        'leadParagraph',
        'overview',
        'whoFor',
        'requirements',
        'timelineSteps',
        'pricing',
        'faq',
        'regulationsCited',
        'outsideScope',
      ]),
    )
  })

  it('uses the bounded canonical content slug contract', () => {
    const slug = (
      Services.fields as {
        name?: string
        maxLength?: number
        validate?: (value: unknown) => true | string
      }[]
    ).find((field) => field.name === 'slug')

    expect(slug?.maxLength).toBe(128)
    expect(slug?.validate?.('work-permit')).toBe(true)
    expect(slug?.validate?.('Work Permit')).toEqual(expect.any(String))
  })

  it('pricing has govFee/ourFee/currency', () => {
    const pricing = (Services.fields as { name?: string; fields?: { name?: string }[] }[]).find(
      (field) => field.name === 'pricing',
    )
    const subnames = pricing?.fields?.map((field) => field.name)

    expect(subnames).toEqual(expect.arrayContaining(['govFee', 'ourFee', 'currency']))
  })

  it('revalidates service dependencies after changes and deletes', () => {
    expect(Services.hooks?.afterChange).toHaveLength(1)
    expect(Services.hooks?.afterDelete).toHaveLength(1)
  })

  it('keeps reads public and restricts mutations to editorial roles', () => {
    const access = Services.access!

    expect(access.read?.(request() as never)).toBe(true)
    expect(access.read?.(request('client') as never)).toBe(true)
    expect(access.read?.(request('editor') as never)).toBe(true)
    expect(access.create?.(request('editor') as never)).toBe(true)
    expect(access.update?.(request('admin') as never)).toBe(true)
    expect(access.delete?.(request('client') as never)).toBe(false)
  })
})
