import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { editorialOnly, publishedOrEditorial } from '../access/roles'

export const Regulations: CollectionConfig = {
  slug: 'regulations',
  admin: { group: 'Editorial', useAsTitle: 'code' },
  access: {
    create: editorialOnly,
    read: publishedOrEditorial,
    update: editorialOnly,
    delete: editorialOnly,
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'e.g., "BKPM Reg 5/2025"' },
    },
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'url', type: 'text', required: true },
    { name: 'effectiveDate', type: 'date' },
    { name: 'notes', type: 'richText', localized: true, editor: lexicalEditor({}) },
  ],
}
