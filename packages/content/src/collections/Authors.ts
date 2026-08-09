import type { CollectionConfig } from 'payload'

import { editorialOnly } from '../access/roles'

export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    group: 'Editorial',
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'email'],
  },
  access: {
    create: editorialOnly,
    read: () => true,
    update: editorialOnly,
    delete: editorialOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text', required: true, localized: true },
    { name: 'bio', type: 'textarea', localized: true },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'linkedinUrl', type: 'text' },
    { name: 'email', type: 'email' },
  ],
}
