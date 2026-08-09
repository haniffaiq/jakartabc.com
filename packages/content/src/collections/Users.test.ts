import { describe, expect, it } from 'vitest'

import { Users } from './Users'

const request = (role?: 'admin' | 'editor' | 'client', id = 'user-1') => ({
  req: { user: role ? { id, role } : null },
})

describe('Users collection', () => {
  it('keeps the shared authentication timing and lock policy', () => {
    expect(Users.slug).toBe('users')
    expect(Users.auth).toMatchObject({
      tokenExpiration: 60 * 60 * 24 * 14,
      maxLoginAttempts: 5,
      lockTime: 10 * 60 * 1000,
      useAPIKey: false,
    })
  })

  it('stores a validated client role in the JWT by default', () => {
    const role = Users.fields.find((field) => 'name' in field && field.name === 'role')

    expect(role).toMatchObject({
      type: 'select',
      defaultValue: 'client',
      options: ['admin', 'editor', 'client'],
      saveToJWT: true,
    })
  })

  it('allows only admins to manage users', () => {
    const access = Users.access!

    expect(access.admin?.(request('admin') as never)).toBe(true)
    expect(access.admin?.(request('editor') as never)).toBe(true)
    expect(access.admin?.(request('client') as never)).toBe(false)

    for (const operation of ['create', 'update', 'delete'] as const) {
      expect(access[operation]?.(request('admin') as never)).toBe(true)
      expect(access[operation]?.(request('editor') as never)).toBe(false)
      expect(access[operation]?.(request('client') as never)).toBe(false)
      expect(access[operation]?.(request() as never)).toBe(false)
    }
  })

  it('allows admins to read all users and authenticated users to read only themselves', () => {
    const read = Users.access!.read!

    expect(read(request('admin') as never)).toBe(true)
    expect(read(request('editor', 'editor-1') as never)).toEqual({
      id: { equals: 'editor-1' },
    })
    expect(read(request('client', 'client-1') as never)).toEqual({
      id: { equals: 'client-1' },
    })
    expect(read(request() as never)).toBe(false)
    expect(read({ req: { user: { role: 'client' } } } as never)).toBe(false)
  })

  it('prevents non-admin role assignment and mutation at field level', () => {
    const role = Users.fields.find((field) => 'name' in field && field.name === 'role')

    expect(role && 'access' in role && role.access?.create?.(request('admin') as never)).toBe(true)
    expect(role && 'access' in role && role.access?.create?.(request('client') as never)).toBe(
      false,
    )
    expect(role && 'access' in role && role.access?.update?.(request('admin') as never)).toBe(true)
    expect(role && 'access' in role && role.access?.update?.(request('editor') as never)).toBe(
      false,
    )
    expect(role && 'access' in role && role.access?.update?.(request('client') as never)).toBe(
      false,
    )
  })
})
