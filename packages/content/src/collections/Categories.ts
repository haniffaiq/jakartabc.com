import type { CollectionConfig } from 'payload'

import { editorialOnly } from '../access/roles'
import { categoryTags, type CacheTagId } from '../cache/tags'
import { makeRevalidateDeleteHook, makeRevalidateHook } from '../hooks/revalidate'

type CategoryTagDocument = { id?: CacheTagId }

const buildCategoryTags = (doc: CategoryTagDocument, previousDoc?: CategoryTagDocument) =>
  categoryTags({ id: doc.id, previousId: previousDoc?.id, locales: ['en', 'id'] })

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    group: 'Editorial',
    useAsTitle: 'name',
  },
  access: {
    create: editorialOnly,
    read: () => true,
    update: editorialOnly,
    delete: editorialOnly,
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'name', type: 'text', required: true, localized: true },
  ],
  hooks: {
    afterChange: [makeRevalidateHook<CategoryTagDocument>(buildCategoryTags)],
    afterDelete: [makeRevalidateDeleteHook<CategoryTagDocument>((doc) => buildCategoryTags(doc))],
  },
}
