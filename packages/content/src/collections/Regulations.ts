import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { editorialOnly } from '../access/roles'
import { regulationTags, type CacheTagId } from '../cache/tags'
import { makeRevalidateDeleteHook, makeRevalidateHook } from '../hooks/revalidate'

type RegulationTagDocument = { id?: CacheTagId }

const buildRegulationTags = (doc: RegulationTagDocument, previousDoc?: RegulationTagDocument) =>
  regulationTags({ id: doc.id, previousId: previousDoc?.id, locales: ['en', 'id'] })

export const Regulations: CollectionConfig = {
  slug: 'regulations',
  admin: { group: 'Editorial', useAsTitle: 'code' },
  access: {
    create: editorialOnly,
    read: () => true,
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
  hooks: {
    afterChange: [makeRevalidateHook<RegulationTagDocument>(buildRegulationTags)],
    afterDelete: [
      makeRevalidateDeleteHook<RegulationTagDocument>((doc) => buildRegulationTags(doc)),
    ],
  },
}
