import { describe, expect, it } from 'vitest'

import { insightTags, MAX_CACHE_TAG_LENGTH, serviceTags } from '../cache/tags'
import { INSIGHT_ARTICLE_SEEDS } from '../seed/insights'
import { SERVICE_SEEDS } from '../seed/services'
import { CONTENT_SLUG_MAX_LENGTH, validateContentSlug } from './contentSlug'

describe('content slug validation', () => {
  const accepted = [
    ...new Set([
      'a',
      ...SERVICE_SEEDS.map(({ slug }) => slug),
      ...INSIGHT_ARTICLE_SEEDS.map(({ slug }) => slug),
      'a'.repeat(CONTENT_SLUG_MAX_LENGTH),
    ]),
  ]

  it.each(accepted)('accepts a bounded lowercase kebab slug: %s', (slug) => {
    expect(validateContentSlug(slug)).toBe(true)
  })

  it.each([
    ['', 'empty'],
    [' leading', 'whitespace'],
    ['trailing ', 'whitespace'],
    ['internal space', 'whitespace'],
    ['Uppercase', 'lowercase'],
    ['two--dashes', 'kebab'],
    ['under_score', 'kebab'],
    ['control\u0000character', 'control'],
    ['a'.repeat(129), '128'],
  ])('rejects %j instead of transforming it', (slug, reason) => {
    expect(validateContentSlug(slug)).toEqual(expect.stringMatching(reason))
  })

  it.each(accepted)('keeps producer tags identical to raw legacy consumer tags: %s', (slug) => {
    const legacyInsightTag = `insights:slug:${slug}`
    const legacyServiceTag = `services:slug:${slug}`
    const producedInsightTag = insightTags({ slug, locales: ['en'] }).find(
      (tag) => tag === legacyInsightTag,
    )
    const producedServiceTag = serviceTags({ slug, locales: ['en'] }).find(
      (tag) => tag === legacyServiceTag,
    )

    expect(producedInsightTag).toBe(legacyInsightTag)
    expect(producedServiceTag).toBe(legacyServiceTag)
    expect(legacyInsightTag.length).toBeLessThanOrEqual(MAX_CACHE_TAG_LENGTH)
    expect(legacyServiceTag.length).toBeLessThanOrEqual(MAX_CACHE_TAG_LENGTH)
  })
})
