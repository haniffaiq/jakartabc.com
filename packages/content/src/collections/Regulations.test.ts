import { describe, expect, it } from 'vitest'

import { Regulations } from './Regulations'

const request = (role?: 'admin' | 'editor' | 'client') => ({
  req: { user: role ? { role } : null },
})

describe('Regulations collection', () => {
  it('has code (unique) + localized title + url + effectiveDate + notes', () => {
    expect(Regulations.slug).toBe('regulations')
    const fields = Regulations.fields as {
      name?: string
      localized?: boolean
      required?: boolean
      unique?: boolean
    }[]
    const code = fields.find((field) => field.name === 'code')
    const title = fields.find((field) => field.name === 'title')

    expect(code).toMatchObject({ required: true, unique: true })
    expect(title).toMatchObject({ localized: true })
    expect(fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['url', 'effectiveDate', 'notes']),
    )
  })

  it('keeps reads public and restricts mutations to editorial roles', () => {
    const access = Regulations.access!

    expect(access.read?.(request() as never)).toBe(true)
    expect(access.read?.(request('client') as never)).toBe(true)
    expect(access.read?.(request('editor') as never)).toBe(true)
    expect(access.create?.(request('admin') as never)).toBe(true)
    expect(access.update?.(request('editor') as never)).toBe(true)
    expect(access.delete?.(request('client') as never)).toBe(false)
  })

  it('revalidates dependent public content after changes and deletes', () => {
    expect(Regulations.hooks?.afterChange).toHaveLength(1)
    expect(Regulations.hooks?.afterDelete).toHaveLength(1)
  })
})
