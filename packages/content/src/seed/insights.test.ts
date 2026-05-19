import { describe, expect, it, vi } from 'vitest'

import {
  INSIGHT_ARTICLE_SEEDS,
  INSIGHT_AUTHOR_SEEDS,
  INSIGHT_CATEGORY_SEEDS,
  seedInsights,
} from './insights'

type PayloadCall = {
  collection: string
  locale?: string
  data?: Record<string, unknown>
  where?: Record<string, { equals: string }>
}

function collectionFrom(call: PayloadCall) {
  return call.collection
}

describe('seedInsights', () => {
  it('defines launch taxonomies, authors, and three published articles', () => {
    expect(INSIGHT_CATEGORY_SEEDS.map((category) => category.slug)).toEqual([
      'regulation',
      'sector',
      'tax',
    ])
    expect(INSIGHT_AUTHOR_SEEDS.map((author) => author.email)).toEqual([
      'diah@jakartabc.com',
      'andi@jakartabc.com',
    ])
    expect(INSIGHT_ARTICLE_SEEDS.map((article) => article.slug)).toEqual([
      'bkpm-reg-5-2025-what-changes',
      'fintech-licensing-2026-update',
      'pph-25-installments-foreign-investor-primer',
    ])
  })

  it('creates categories, authors, and articles with ID locale updates', async () => {
    const categoryLookups = new Map<string, number>()
    const authorLookups = new Map<string, number>()
    const find = vi.fn(async ({ collection, where }: PayloadCall) => {
      if (collection === 'categories' && where?.slug?.equals) {
        const slug = where.slug.equals
        const seen = categoryLookups.get(slug) ?? 0
        categoryLookups.set(slug, seen + 1)
        return seen === 0 ? { docs: [] } : { docs: [{ id: `category-${slug}` }] }
      }
      if (collection === 'authors' && where?.email?.equals) {
        return { docs: [] }
      }
      if (collection === 'authors' && where?.name?.equals) {
        const name = where.name.equals
        const seen = authorLookups.get(name) ?? 0
        authorLookups.set(name, seen + 1)
        return seen === 0
          ? { docs: [{ id: `author-${name}` }] }
          : { docs: [{ id: `author-${name}` }] }
      }
      return { docs: [] }
    })
    const create = vi.fn(async ({ collection, data }: PayloadCall) => ({
      id: `created-${collection}-${data?.slug ?? data?.email}`,
    }))
    const update = vi.fn(async () => ({}))

    await seedInsights({ find, create, update } as never)

    expect(create.mock.calls.map(([call]) => collectionFrom(call))).toEqual([
      'categories',
      'categories',
      'categories',
      'authors',
      'authors',
      'insights',
      'insights',
      'insights',
    ])
    expect(update).toHaveBeenCalledTimes(8)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'insights',
        locale: 'en',
        data: expect.objectContaining({
          slug: 'bkpm-reg-5-2025-what-changes',
          category: 'category-regulation',
          author: 'author-Diah Putri',
          status: 'published',
        }),
      }),
    )
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'insights',
        locale: 'id',
        data: expect.objectContaining({
          title: 'Cicilan PPh 25: panduan untuk investor asing',
          body: expect.objectContaining({ root: expect.any(Object) }),
        }),
      }),
    )
  })

  it('skips existing articles by slug without creating duplicates', async () => {
    const find = vi.fn(async ({ collection }: PayloadCall) => {
      if (collection === 'insights') {
        return { docs: [{ id: 'existing-insight' }] }
      }
      return { docs: [{ id: `existing-${collection}` }] }
    })
    const create = vi.fn()
    const update = vi.fn(async () => ({}))

    await seedInsights({ find, create, update } as never)

    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
