import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const Regulations: CollectionConfig = {
  slug: 'regulations',
  admin: { group: 'Editorial', useAsTitle: 'code' },
  access: { read: () => true },
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
