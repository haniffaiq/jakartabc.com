import type { CollectionConfig } from 'payload'

import { editorialOnly, publishedOrEditorial } from '../access/roles'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    group: 'Editorial',
    useAsTitle: 'name',
  },
  access: {
    create: editorialOnly,
    read: publishedOrEditorial,
    update: editorialOnly,
    delete: editorialOnly,
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'name', type: 'text', required: true, localized: true },
  ],
}
