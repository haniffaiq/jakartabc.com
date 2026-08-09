import { describe, expect, it } from 'vitest'

import { Authors } from './Authors'

const request = (role?: 'admin' | 'editor' | 'client') => ({
  req: { user: role ? { role } : null },
})

describe('Authors collection', () => {
  it('has expected slug + fields', () => {
    expect(Authors.slug).toBe('authors')
    const fieldNames = Authors.fields.map((field) => ('name' in field ? field.name : ''))

    expect(fieldNames).toEqual(
      expect.arrayContaining(['name', 'role', 'bio', 'photo', 'linkedinUrl', 'email']),
    )
  })

  it('bio + role are localized', () => {
    const bio = Authors.fields.find((field) => 'name' in field && field.name === 'bio')
    const role = Authors.fields.find((field) => 'name' in field && field.name === 'role')

    expect(bio && 'localized' in bio && bio.localized).toBe(true)
    expect(role && 'localized' in role && role.localized).toBe(true)
  })

  it('allows published reads and restricts mutations to editorial roles', () => {
    const access = Authors.access!

    expect(access.read?.(request() as never)).toEqual({ _status: { equals: 'published' } })
    expect(access.read?.(request('client') as never)).toEqual({ _status: { equals: 'published' } })
    expect(access.read?.(request('editor') as never)).toBe(true)
    expect(access.create?.(request('admin') as never)).toBe(true)
    expect(access.update?.(request('editor') as never)).toBe(true)
    expect(access.delete?.(request('client') as never)).toBe(false)
  })
})
