import { describe, expect, it } from 'vitest'

import { Services } from './Services'

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

  it('pricing has govFee/ourFee/currency', () => {
    const pricing = (Services.fields as { name?: string; fields?: { name?: string }[] }[]).find(
      (field) => field.name === 'pricing',
    )
    const subnames = pricing?.fields?.map((field) => field.name)

    expect(subnames).toEqual(expect.arrayContaining(['govFee', 'ourFee', 'currency']))
  })

  it('revalidates service list, slug detail, and pricing tags after change', () => {
    const hooks = Services.hooks?.afterChange ?? []

    expect(hooks).toHaveLength(1)
  })
})
