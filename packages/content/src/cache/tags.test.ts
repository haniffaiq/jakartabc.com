import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import {
  MAX_CACHE_TAG_LENGTH,
  MAX_REVALIDATE_TAGS_PER_REQUEST,
  authorTags,
  cacheTagIds,
  canonicalCacheTag,
  categoryTags,
  chunkCacheTags,
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
      'insights:list',
      'insights:slug:new',
      'insights:slug:old',
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
      'insights:list',
      'insights:slug:article',
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
      'services:list',
      'services:slug:work-permit',
      'services:slug:old-permit',
      'pricing',
    ])
  })

  it('builds conservative dependent tags for related collections', () => {
    expect(authorTags({ id: 'writer-1', locales: ['en'] })).toEqual([
      'authors:en',
      'author:en:writer-1',
      'insights:en',
      'insights:list',
    ])
    expect(categoryTags({ id: 'tax', previousId: 'old-tax', locales: ['en'] })).toEqual([
      'categories:en',
      'category:en:tax',
      'category:en:old-tax',
      'insights:en',
      'insights:list',
    ])
    expect(regulationTags({ id: 5, locales: ['en'] })).toEqual([
      'regulations:en',
      'regulation:en:5',
      'insights:en',
      'services:en',
      'insights:list',
      'services:list',
      'pricing',
    ])
    expect(mediaTags({ id: 'hero', locales: ['en'] })).toEqual([
      'media:en',
      'media:en:hero',
      'insights:en',
      'authors:en',
      'insights:list',
    ])
  })

  it('invalidates both site locales for every public global', () => {
    expect(siteTags({ locales: ['id', 'en', 'id'] })).toEqual(['site:en', 'site:id'])
  })

  it('canonically hashes overlong tags without collisions between tested values', () => {
    const first = canonicalCacheTag(`insight:en:${'a'.repeat(400)}`)
    const second = canonicalCacheTag(`insight:en:${'a'.repeat(399)}b`)

    expect(first).toHaveLength(MAX_CACHE_TAG_LENGTH)
    expect(first).toMatch(/:sha256:[a-f0-9]{64}$/)
    expect(first).toBe(canonicalCacheTag(`insight:en:${'a'.repeat(400)}`))
    expect(second).not.toBe(first)
    expect(canonicalCacheTag('insights:en')).toBe('insights:en')
  })

  it('canonicalizes long slug and relationship components in every builder output', () => {
    const tags = insightTags({
      slug: 's'.repeat(400),
      locales: ['en'],
      authorIds: ['a'.repeat(400)],
    })

    expect(tags.every((tag) => tag.length <= MAX_CACHE_TAG_LENGTH)).toBe(true)
    expect(tags.filter((tag) => tag.includes(':sha256:'))).toHaveLength(3)
  })

  it('chunks 100 and 101 canonical tags deterministically', () => {
    const oneHundred = Array.from({ length: 100 }, (_, index) => `tag:${index}`)
    const oneHundredAndOne = [...oneHundred, 'tag:100']

    expect(chunkCacheTags(oneHundred)).toEqual([oneHundred])
    expect(chunkCacheTags(oneHundredAndOne).map((chunk) => chunk.length)).toEqual([
      MAX_REVALIDATE_TAGS_PER_REQUEST,
      1,
    ])
    expect(chunkCacheTags(oneHundredAndOne).flat()).toEqual(oneHundredAndOne)
  })

  it('dual-emits every tag literal consumed by current Insight and service pages', async () => {
    const [insightList, insightDetail, serviceList, serviceDetail, pricing] = await Promise.all([
      readFile(
        new URL('../../../../apps/web/src/app/[locale]/insights/page.tsx', import.meta.url),
        'utf8',
      ),
      readFile(
        new URL('../../../../apps/web/src/app/[locale]/insights/[slug]/page.tsx', import.meta.url),
        'utf8',
      ),
      readFile(
        new URL('../../../../apps/web/src/app/[locale]/services/page.tsx', import.meta.url),
        'utf8',
      ),
      readFile(
        new URL('../../../../apps/web/src/app/[locale]/services/[slug]/page.tsx', import.meta.url),
        'utf8',
      ),
      readFile(
        new URL('../../../../apps/web/src/app/[locale]/pricing/page.tsx', import.meta.url),
        'utf8',
      ),
    ])

    expect(insightList).toContain("tags: ['insights:list']")
    expect(insightDetail).toContain('`insights:slug:${slug}`')
    expect(insightTags({ slug: 'article', locales: ['en'] })).toEqual(
      expect.arrayContaining(['insights:list', 'insights:slug:article']),
    )

    expect(serviceList).toContain("tags: ['services:list']")
    expect(serviceDetail).toContain('`services:slug:${slug}`')
    expect(pricing).toContain("tags: ['pricing', 'services:list']")
    expect(serviceTags({ slug: 'permit', locales: ['en'] })).toEqual(
      expect.arrayContaining(['services:list', 'services:slug:permit', 'pricing']),
    )
  })
})
