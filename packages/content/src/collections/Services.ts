import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { editorialOnly } from '../access/roles'
import { cacheTagIds, serviceTags } from '../cache/tags'
import { makeRevalidateDeleteHook, makeRevalidateHook } from '../hooks/revalidate'

type ServiceTagDocument = {
  slug?: string | null
  regulationsCited?: unknown
}

const buildServiceTags = (doc: ServiceTagDocument, previousDoc?: ServiceTagDocument) =>
  serviceTags({
    slug: doc.slug,
    previousSlug: previousDoc?.slug,
    locales: ['en', 'id'],
    regulationIds: cacheTagIds(doc.regulationsCited, previousDoc?.regulationsCited),
  })

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    group: 'Editorial',
    useAsTitle: 'name',
    defaultColumns: ['order', 'name', 'timelineLabel'],
  },
  access: {
    create: editorialOnly,
    read: () => true,
    update: editorialOnly,
    delete: editorialOnly,
  },
  defaultSort: 'order',
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'order', type: 'number', required: true, defaultValue: 100 },
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'timelineLabel', type: 'text', required: true, localized: true },
    { name: 'leadParagraph', type: 'textarea', required: true, localized: true },
    {
      name: 'overview',
      type: 'richText',
      required: true,
      localized: true,
      editor: lexicalEditor({}),
    },
    {
      name: 'whoFor',
      type: 'array',
      localized: true,
      fields: [
        { name: 'persona', type: 'text', required: true },
        { name: 'desc', type: 'textarea' },
      ],
    },
    {
      name: 'requirements',
      type: 'array',
      localized: true,
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    {
      name: 'timelineSteps',
      type: 'array',
      localized: true,
      fields: [
        { name: 'week', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
        {
          name: 'who',
          type: 'select',
          required: true,
          options: [
            { label: 'Jakarta BC', value: 'we' },
            { label: 'Joint', value: 'joint' },
            { label: 'Client', value: 'you' },
          ],
        },
        { name: 'docs', type: 'array', fields: [{ name: 'doc', type: 'text' }] },
      ],
    },
    {
      name: 'pricing',
      type: 'group',
      fields: [
        { name: 'govFee', type: 'number', required: true, defaultValue: 0 },
        { name: 'ourFee', type: 'number', required: true, defaultValue: 0 },
        { name: 'currency', type: 'text', required: true, defaultValue: 'IDR' },
      ],
    },
    {
      name: 'faq',
      type: 'array',
      localized: true,
      fields: [
        { name: 'q', type: 'text', required: true },
        { name: 'a', type: 'textarea', required: true },
      ],
    },
    { name: 'regulationsCited', type: 'relationship', relationTo: 'regulations', hasMany: true },
    { name: 'outsideScope', type: 'textarea', localized: true },
  ],
  hooks: {
    afterChange: [makeRevalidateHook<ServiceTagDocument>(buildServiceTags)],
    afterDelete: [makeRevalidateDeleteHook<ServiceTagDocument>((doc) => buildServiceTags(doc))],
  },
}
