import { describe, expect, it } from 'vitest'

import { Categories } from './Categories'

const request = (role?: 'admin' | 'editor' | 'client') => ({
  req: { user: role ? { role } : null },
})

describe('Categories collection', () => {
  it('has slug + localized name', () => {
    expect(Categories.slug).toBe('categories')

    const name = Categories.fields.find((field) => 'name' in field && field.name === 'name')

    expect(name && 'localized' in name && name.localized).toBe(true)
  })

  it('keeps reads public and restricts mutations to editorial roles', () => {
    const access = Categories.access!

    expect(access.read?.(request() as never)).toBe(true)
    expect(access.read?.(request('client') as never)).toBe(true)
    expect(access.read?.(request('editor') as never)).toBe(true)
    expect(access.create?.(request('editor') as never)).toBe(true)
    expect(access.update?.(request('admin') as never)).toBe(true)
    expect(access.delete?.(request('client') as never)).toBe(false)
  })

  it('revalidates dependent public content after changes and deletes', () => {
    expect(Categories.hooks?.afterChange).toHaveLength(1)
    expect(Categories.hooks?.afterDelete).toHaveLength(1)
  })
})
