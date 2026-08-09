import type { CollectionConfig } from 'payload'

import { editorialOnly } from '../access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Editorial' },
  access: {
    create: editorialOnly,
    read: () => true,
    update: editorialOnly,
    delete: editorialOnly,
  },
  upload: {
    staticDir: 'uploads',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'],
    imageSizes: [
      { name: 'thumb', width: 400 },
      { name: 'card', width: 800 },
      { name: 'hero', width: 1600 },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, localized: true },
    { name: 'caption', type: 'text', localized: true },
  ],
}
