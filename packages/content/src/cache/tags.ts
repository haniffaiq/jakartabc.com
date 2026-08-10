import { createHash } from 'node:crypto'

export type CacheTagId = string | number | null | undefined

export const MAX_CACHE_TAG_LENGTH = 256
export const MAX_REVALIDATE_TAGS_PER_REQUEST = 100

type LocaleTagInput = {
  locales: readonly string[]
}

type DetailTagInput = LocaleTagInput & {
  id: CacheTagId
  previousId?: CacheTagId
}

export type InsightTagInput = LocaleTagInput & {
  slug: CacheTagId
  previousSlug?: CacheTagId
  authorIds?: readonly CacheTagId[]
  categoryIds?: readonly CacheTagId[]
  regulationIds?: readonly CacheTagId[]
  mediaIds?: readonly CacheTagId[]
}

export type ServiceTagInput = LocaleTagInput & {
  slug: CacheTagId
  previousSlug?: CacheTagId
  regulationIds?: readonly CacheTagId[]
}

const clean = (value: CacheTagId) => {
  if (value === null || value === undefined) return undefined

  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : undefined
}

const sortedUnique = (values: readonly CacheTagId[]) =>
  [...new Set(values.map(clean).filter((value): value is string => value !== undefined))].sort()

export function cacheTagIds(...values: readonly unknown[]): string[] {
  const ids = values.flatMap((value): CacheTagId[] => {
    if (Array.isArray(value)) return cacheTagIds(...value)
    if (typeof value === 'string' || typeof value === 'number') return [value]
    if (value && typeof value === 'object') return [Reflect.get(value, 'id') as CacheTagId]
    return []
  })

  return sortedUnique(ids)
}

const orderedUnique = (values: readonly CacheTagId[]) => [
  ...new Set(values.map(clean).filter((value): value is string => value !== undefined)),
]

export function canonicalCacheTag(tag: string) {
  if (tag.length <= MAX_CACHE_TAG_LENGTH) return tag

  const digest = createHash('sha256').update(tag).digest('hex')
  const suffix = `:sha256:${digest}`
  return `${tag.slice(0, MAX_CACHE_TAG_LENGTH - suffix.length)}${suffix}`
}

export function canonicalCacheTags(tags: readonly string[]) {
  return [
    ...new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map(canonicalCacheTag),
    ),
  ]
}

export function chunkCacheTags(tags: readonly string[]) {
  const canonicalTags = canonicalCacheTags(tags)
  const chunks: string[][] = []

  for (let index = 0; index < canonicalTags.length; index += MAX_REVALIDATE_TAGS_PER_REQUEST) {
    chunks.push(canonicalTags.slice(index, index + MAX_REVALIDATE_TAGS_PER_REQUEST))
  }

  return chunks
}

const forLocales = (locales: readonly string[], build: (locale: string) => readonly CacheTagId[]) =>
  sortedUnique(locales).flatMap((locale) => orderedUnique(build(locale)))

const dependencyTags = (kind: string, locale: string, ids: readonly CacheTagId[] = []) =>
  sortedUnique(ids).map((id) => `${kind}:${locale}:${id}`)

export function insightTags({
  slug,
  previousSlug,
  locales,
  authorIds = [],
  categoryIds = [],
  regulationIds = [],
  mediaIds = [],
}: InsightTagInput) {
  return canonicalCacheTags([
    ...forLocales(locales, (locale) => [
      `insights:${locale}`,
      ...orderedUnique([slug, previousSlug]).map((value) => `insight:${locale}:${value}`),
      ...dependencyTags('author', locale, authorIds),
      ...dependencyTags('category', locale, categoryIds),
      ...dependencyTags('regulation', locale, regulationIds),
      ...dependencyTags('media', locale, mediaIds),
    ]),
    'insights:list',
    ...orderedUnique([slug, previousSlug]).map((value) => `insights:slug:${value}`),
  ])
}

export function serviceTags({ slug, previousSlug, locales, regulationIds = [] }: ServiceTagInput) {
  return canonicalCacheTags([
    ...forLocales(locales, (locale) => [
      `services:${locale}`,
      ...orderedUnique([slug, previousSlug]).map((value) => `service:${locale}:${value}`),
      `pricing:${locale}`,
      ...dependencyTags('regulation', locale, regulationIds),
    ]),
    'services:list',
    ...orderedUnique([slug, previousSlug]).map((value) => `services:slug:${value}`),
    'pricing',
  ])
}

export function authorTags({ id, previousId, locales }: DetailTagInput) {
  return canonicalCacheTags(
    forLocales(locales, (locale) => [
      `authors:${locale}`,
      ...orderedUnique([id, previousId]).map((value) => `author:${locale}:${value}`),
      `insights:${locale}`,
      'insights:list',
    ]),
  )
}

export function categoryTags({ id, previousId, locales }: DetailTagInput) {
  return canonicalCacheTags(
    forLocales(locales, (locale) => [
      `categories:${locale}`,
      ...orderedUnique([id, previousId]).map((value) => `category:${locale}:${value}`),
      `insights:${locale}`,
      'insights:list',
    ]),
  )
}

export function regulationTags({ id, previousId, locales }: DetailTagInput) {
  return canonicalCacheTags(
    forLocales(locales, (locale) => [
      `regulations:${locale}`,
      ...orderedUnique([id, previousId]).map((value) => `regulation:${locale}:${value}`),
      `insights:${locale}`,
      `services:${locale}`,
      'insights:list',
      'services:list',
      'pricing',
    ]),
  )
}

export function mediaTags({ id, previousId, locales }: DetailTagInput) {
  return canonicalCacheTags(
    forLocales(locales, (locale) => [
      `media:${locale}`,
      ...orderedUnique([id, previousId]).map((value) => `media:${locale}:${value}`),
      `insights:${locale}`,
      `authors:${locale}`,
      'insights:list',
    ]),
  )
}

export function siteTags({ locales }: LocaleTagInput) {
  return canonicalCacheTags(sortedUnique(locales).map((locale) => `site:${locale}`))
}
