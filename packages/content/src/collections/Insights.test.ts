import { describe, expect, it, vi } from 'vitest'

import { Insights } from './Insights'

const request = (role?: 'admin' | 'editor' | 'client') => ({
  req: { user: role ? { role } : null },
})

type FieldLike = {
  name?: string
  localized?: boolean
  maxLength?: number
  unique?: boolean
  relationTo?: string | string[]
  validate?: (value: unknown) => true | string
}

describe('Insights collection', () => {
  it('has expected slug and fields', () => {
    expect(Insights.slug).toBe('insights')
    const names = (Insights.fields as FieldLike[]).map((field) => field.name)

    expect(names).toEqual(
      expect.arrayContaining([
        'slug',
        'title',
        'lead',
        'body',
        'category',
        'author',
        'coverImage',
        'regulationsCited',
        'publishedAt',
        'estReadTime',
        'seo',
      ]),
    )
    expect(names).not.toContain('status')
    expect(Insights.admin?.defaultColumns).toContain('_status')
  })

  it('localizes editorial title, lead, body, and SEO copy', () => {
    const fields = Insights.fields as FieldLike[]

    for (const name of ['title', 'lead', 'body', 'seo']) {
      expect(fields.find((field) => field.name === name)?.localized).toBe(true)
    }
  })

  it('keeps slug global, unique, bounded, and validated', () => {
    const slug = (Insights.fields as FieldLike[]).find((field) => field.name === 'slug')

    expect(slug?.localized).toBeFalsy()
    expect(slug?.unique).toBe(true)
    expect(slug?.maxLength).toBe(128)
    expect(slug?.validate?.('pt-pma-setup')).toBe(true)
    expect(slug?.validate?.(' PT-PMA-SETUP ')).toEqual(expect.any(String))
  })

  it('relates to editorial taxonomies and supporting collections', () => {
    const fields = Insights.fields as FieldLike[]

    expect(fields.find((field) => field.name === 'category')?.relationTo).toBe('categories')
    expect(fields.find((field) => field.name === 'author')?.relationTo).toBe('authors')
    expect(fields.find((field) => field.name === 'coverImage')?.relationTo).toBe('media')
    expect(fields.find((field) => field.name === 'regulationsCited')?.relationTo).toBe(
      'regulations',
    )
  })

  it('computes estimated read time before change', async () => {
    const hook = Insights.hooks?.beforeChange?.[0]
    const data = {
      body: {
        root: { children: [{ children: [{ text: 'word '.repeat(250) }] }] },
      },
    }

    const result = await hook?.({ data } as never)

    expect(result?.estReadTime).toBe(2)
  })

  it('allows published reads and restricts mutations to editorial roles', () => {
    const access = Insights.access!

    expect(access.read?.(request() as never)).toEqual({ _status: { equals: 'published' } })
    expect(access.read?.(request('client') as never)).toEqual({ _status: { equals: 'published' } })
    expect(access.read?.(request('editor') as never)).toBe(true)
    expect(access.create?.(request('editor') as never)).toBe(true)
    expect(access.update?.(request('admin') as never)).toBe(true)
    expect(access.delete?.(request('client') as never)).toBe(false)
  })

  it('revalidates affected tags after changes and deletes', () => {
    expect(Insights.hooks?.afterChange).toHaveLength(1)
    expect(Insights.hooks?.afterDelete).toHaveLength(1)
  })

  it('invalidates old and new Insight dependencies after a relationship change', async () => {
    const queue = vi.fn().mockResolvedValue({ id: 'job-1' })
    const hook = Insights.hooks?.afterChange?.[0]
    expect(hook).toBeTypeOf('function')

    await hook?.({
      doc: {
        slug: 'new',
        author: { id: 'author-new' },
        category: { id: 'category-new' },
        coverImage: { id: 'media-new' },
        regulationsCited: [{ id: 'reg-new' }],
      },
      previousDoc: {
        slug: 'old',
        author: 'author-old',
        category: 'category-old',
        coverImage: 'media-old',
        regulationsCited: ['reg-old'],
      },
      req: { payload: { jobs: { queue }, logger: {} }, transactionID: 'transaction-1' },
    } as never)

    const tags = queue.mock.calls[0]?.[0].input.tags as string[]
    expect(tags).toEqual(
      expect.arrayContaining([
        'insights:en',
        'insight:en:new',
        'insight:en:old',
        'author:en:author-new',
        'author:en:author-old',
        'category:en:category-new',
        'category:en:category-old',
        'regulation:en:reg-new',
        'regulation:en:reg-old',
        'media:en:media-new',
        'media:en:media-old',
        'insights:id',
        'insight:id:new',
        'insight:id:old',
      ]),
    )
  })
})
