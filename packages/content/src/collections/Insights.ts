import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { dropCap } from '../blocks/dropCap'
import { pullQuote } from '../blocks/pullQuote'
import { regulationCite } from '../blocks/regulationCite'
import { editorialOnly, publishedOrEditorial } from '../access/roles'
import { cacheTagIds, insightTags } from '../cache/tags'
import { calcReadTime } from '../hooks/readTime'
import { makeRevalidateDeleteHook, makeRevalidateHook } from '../hooks/revalidate'
import { CONTENT_SLUG_MAX_LENGTH, validateContentSlug } from '../validation/contentSlug'

type InsightTagDocument = {
  slug?: string | null
  author?: unknown
  category?: unknown
  coverImage?: unknown
  regulationsCited?: unknown
}

const buildInsightTags = (doc: InsightTagDocument, previousDoc?: InsightTagDocument) =>
  insightTags({
    slug: doc.slug,
    previousSlug: previousDoc?.slug,
    locales: ['en', 'id'],
    authorIds: cacheTagIds(doc.author, previousDoc?.author),
    categoryIds: cacheTagIds(doc.category, previousDoc?.category),
    regulationIds: cacheTagIds(doc.regulationsCited, previousDoc?.regulationsCited),
    mediaIds: cacheTagIds(doc.coverImage, previousDoc?.coverImage),
  })

export const Insights: CollectionConfig = {
  slug: 'insights',
  admin: {
    group: 'Editorial',
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'publishedAt', 'category'],
  },
  access: {
    create: editorialOnly,
    read: publishedOrEditorial,
    update: editorialOnly,
    delete: editorialOnly,
  },
  versions: { drafts: true },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      maxLength: CONTENT_SLUG_MAX_LENGTH,
      validate: validateContentSlug,
    },
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'lead', type: 'textarea', required: true, localized: true },
    {
      name: 'body',
      type: 'richText',
      required: true,
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
          BlocksFeature({ blocks: [dropCap, pullQuote, regulationCite] }),
          FixedToolbarFeature(),
        ],
      }),
    },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'author', type: 'relationship', relationTo: 'authors', required: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'regulationsCited', type: 'relationship', relationTo: 'regulations', hasMany: true },
    { name: 'publishedAt', type: 'date', required: true },
    {
      name: 'estReadTime',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Auto-generated from body word count at roughly 200 words per minute.',
      },
    },
    {
      name: 'seo',
      type: 'group',
      localized: true,
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
      ],
    },
  ],
  hooks: {
    afterChange: [makeRevalidateHook<InsightTagDocument>(buildInsightTags)],
    afterDelete: [makeRevalidateDeleteHook<InsightTagDocument>((doc) => buildInsightTags(doc))],
    beforeChange: [
      ({ data }) => {
        if (data.body) {
          data.estReadTime = calcReadTime(data.body)
        }

        return data
      },
    ],
  },
}
