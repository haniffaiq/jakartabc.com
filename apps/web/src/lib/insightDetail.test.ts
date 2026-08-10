import { describe, expect, it } from 'vitest'

import { buildInsightCacheTags } from './insightDetail'

describe('Insight cache tags', () => {
  it('uses canonical locale and detail tags from the content cache graph', () => {
    expect(buildInsightCacheTags('id', 'bkpm-reg-5-2025-what-changes')).toEqual([
      'insights:id',
      'insight:id:bkpm-reg-5-2025-what-changes',
      'insights:list',
      'insights:slug:bkpm-reg-5-2025-what-changes',
    ])
  })

  it('uses only list-level tags when no slug is present', () => {
    expect(buildInsightCacheTags('en')).toEqual(['insights:en', 'insights:list'])
  })
})
