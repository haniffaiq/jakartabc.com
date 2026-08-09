import { describe, expect, it } from 'vitest'

import { Insights } from './Insights'

const request = (role?: 'admin' | 'editor' | 'client') => ({
  req: { user: role ? { role } : null },
})

type FieldLike = {
  name?: string
  localized?: boolean
  unique?: boolean
  relationTo?: string | string[]
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
        'status',
        'seo',
      ]),
    )
  })

  it('localizes editorial title, lead, body, and SEO copy', () => {
    const fields = Insights.fields as FieldLike[]

    for (const name of ['title', 'lead', 'body', 'seo']) {
      expect(fields.find((field) => field.name === name)?.localized).toBe(true)
    }
  })

  it('keeps slug global and unique', () => {
    const slug = (Insights.fields as FieldLike[]).find((field) => field.name === 'slug')

    expect(slug?.localized).toBeFalsy()
    expect(slug?.unique).toBe(true)
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

    const result = await hook?.({ data } as any)

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
})
