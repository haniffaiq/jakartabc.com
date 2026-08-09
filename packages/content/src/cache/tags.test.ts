import { describe, expect, it } from 'vitest'

import {
  authorTags,
  cacheTagIds,
  categoryTags,
  insightTags,
  mediaTags,
  regulationTags,
  serviceTags,
  siteTags,
} from './tags'

describe('content cache tags', () => {
  it('normalizes IDs from direct, populated, and repeated relationship values', () => {
    expect(
      cacheTagIds('direct', { id: 'populated' }, [3, { id: 'populated' }, null], undefined),
    ).toEqual(['3', 'direct', 'populated'])
  })

  it('builds deterministic locale-aware Insight tags for old and new slugs', () => {
    expect(
      insightTags({
        slug: 'new',
        previousSlug: 'old',
        locales: ['id', 'en', 'id'],
      }),
    ).toEqual([
      'insights:en',
      'insight:en:new',
      'insight:en:old',
      'insights:id',
      'insight:id:new',
      'insight:id:old',
    ])
  })

  it('deduplicates and sorts Insight relationship dependencies', () => {
    expect(
      insightTags({
        slug: 'article',
        locales: ['en'],
        authorIds: ['author-b', 'author-a', 'author-b'],
        categoryIds: ['tax', 'law', 'tax'],
        regulationIds: [20, 10, 20],
        mediaIds: ['cover-b', 'cover-a', 'cover-b'],
      }),
    ).toEqual([
      'insights:en',
      'insight:en:article',
      'author:en:author-a',
      'author:en:author-b',
      'category:en:law',
      'category:en:tax',
      'regulation:en:10',
      'regulation:en:20',
      'media:en:cover-a',
      'media:en:cover-b',
    ])
  })

  it('builds service list, detail, pricing, and regulation dependency tags', () => {
    expect(
      serviceTags({
        slug: 'work-permit',
        previousSlug: 'old-permit',
        locales: ['id', 'en'],
        regulationIds: ['bkpm-5', 'bkpm-5'],
      }),
    ).toEqual([
      'services:en',
      'service:en:work-permit',
      'service:en:old-permit',
      'pricing:en',
      'regulation:en:bkpm-5',
      'services:id',
      'service:id:work-permit',
      'service:id:old-permit',
      'pricing:id',
      'regulation:id:bkpm-5',
    ])
  })

  it('builds conservative dependent tags for related collections', () => {
    expect(authorTags({ id: 'writer-1', locales: ['en'] })).toEqual([
      'authors:en',
      'author:en:writer-1',
      'insights:en',
    ])
    expect(categoryTags({ id: 'tax', previousId: 'old-tax', locales: ['en'] })).toEqual([
      'categories:en',
      'category:en:tax',
      'category:en:old-tax',
      'insights:en',
    ])
    expect(regulationTags({ id: 5, locales: ['en'] })).toEqual([
      'regulations:en',
      'regulation:en:5',
      'insights:en',
      'services:en',
    ])
    expect(mediaTags({ id: 'hero', locales: ['en'] })).toEqual([
      'media:en',
      'media:en:hero',
      'insights:en',
      'authors:en',
    ])
  })

  it('invalidates both site locales for every public global', () => {
    expect(siteTags({ locales: ['id', 'en', 'id'] })).toEqual(['site:en', 'site:id'])
  })
})
