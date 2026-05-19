import { describe, expect, it } from 'vitest'

import { buildInsightCacheKey, formatInsightDate, hasRegulations } from '@/lib/insightDetail'

describe('insight detail page helpers', () => {
  it('formats publication dates with locale-aware short months in UTC', () => {
    expect(formatInsightDate('2026-05-10', 'en')).toBe('May 10, 2026')
    expect(formatInsightDate('2026-05-10', 'id')).toBe('10 Mei 2026')
    expect(formatInsightDate('2026-05-10T00:00:00.000Z', 'en')).toBe('May 10, 2026')
  })

  it('keys cached insight lookups by locale and slug', () => {
    expect(buildInsightCacheKey('bkpm-reg-5-2025-what-changes', 'id')).toEqual([
      'insight',
      'id',
      'bkpm-reg-5-2025-what-changes',
    ])
  })

  it('only shows the regulations footer when citations exist', () => {
    expect(hasRegulations([])).toBe(false)
    expect(hasRegulations(undefined)).toBe(false)
    expect(
      hasRegulations([{ id: 'bkpm-5', code: 'BKPM Reg 5/2025', title: 'BKPM 5', url: '#' }]),
    ).toBe(true)
  })
})
