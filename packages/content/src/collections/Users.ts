import type { CollectionConfig } from 'payload'

import { adminOnly, canAccessAdmin } from '../access/roles'

const readUsers: NonNullable<CollectionConfig['access']>['read'] = (args) => {
  if (adminOnly(args)) return true

  const user = args.req.user
  const id = user && typeof user === 'object' ? Reflect.get(user, 'id') : undefined

  return typeof id === 'string' || typeof id === 'number' ? { id: { equals: id } } : false
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 14,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    useAPIKey: false,
  },
  admin: { useAsTitle: 'email' },
  access: {
    admin: canAccessAdmin,
    create: adminOnly,
    read: readUsers,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'client',
      options: ['admin', 'editor', 'client'],
      saveToJWT: true,
      access: {
        create: adminOnly,
        update: adminOnly,
      },
    },
  ],
}
