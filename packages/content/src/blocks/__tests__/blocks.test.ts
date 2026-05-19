import { describe, expect, it } from 'vitest'

import { dropCap } from '../dropCap'
import { pullQuote } from '../pullQuote'
import { regulationCite } from '../regulationCite'

describe('Lexical blocks', () => {
  it('dropCap has expected slug + flag field', () => {
    expect(dropCap.slug).toBe('dropCap')
    expect(dropCap.fields.find((field: any) => field.name === 'enabled')).toBeTruthy()
  })

  it('pullQuote has localized quote + attribution', () => {
    expect(pullQuote.slug).toBe('pullQuote')
    const quote = pullQuote.fields.find((field: any) => field.name === 'quote')
    const attribution = pullQuote.fields.find((field: any) => field.name === 'attribution')

    expect((quote as any).localized).toBe(true)
    expect((attribution as any).localized).toBe(true)
  })

  it('regulationCite relates to regulations', () => {
    expect(regulationCite.slug).toBe('regulationCite')
    const relationship = regulationCite.fields.find((field: any) => field.name === 'regulation')

    expect((relationship as any).relationTo).toBe('regulations')
  })
})
