import { describe, expect, it } from 'vitest'

import {
  adminOnly,
  canAccessAdmin,
  clientOnly,
  editorialOnly,
  publishedOrEditorial,
  type Role,
} from './roles'

const req = (role?: Role) => ({ req: { user: role ? { role } : null } })

describe('role access helpers', () => {
  it('enforces the role capability matrix', () => {
    expect(adminOnly(req('admin'))).toBe(true)
    expect(adminOnly(req('editor'))).toBe(false)
    expect(editorialOnly(req('admin'))).toBe(true)
    expect(editorialOnly(req('editor'))).toBe(true)
    expect(editorialOnly(req('client'))).toBe(false)
    expect(clientOnly(req('client'))).toBe(true)
    expect(clientOnly(req('admin'))).toBe(false)
    expect(canAccessAdmin(req('client'))).toBe(false)
    expect(canAccessAdmin(req('editor'))).toBe(true)
  })

  it.each([null, undefined, 'admin', {}, { role: 'owner' }, { role: 1 }])(
    'denies malformed user value %j',
    (user) => {
      const args = { req: { user } }

      expect(adminOnly(args)).toBe(false)
      expect(editorialOnly(args)).toBe(false)
      expect(clientOnly(args)).toBe(false)
      expect(canAccessAdmin(args)).toBe(false)
    },
  )

  it.each([
    ['anonymous', undefined, { _status: { equals: 'published' } }],
    ['client', 'client' as const, { _status: { equals: 'published' } }],
    ['editor', 'editor' as const, true],
    ['admin', 'admin' as const, true],
  ])('applies published/draft read policy for %s', (_label, role, expected) => {
    expect(publishedOrEditorial(req(role))).toEqual(expected)
  })
})
