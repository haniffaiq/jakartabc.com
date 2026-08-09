export type CacheTagId = string | number | null | undefined

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
  return forLocales(locales, (locale) => [
    `insights:${locale}`,
    ...orderedUnique([slug, previousSlug]).map((value) => `insight:${locale}:${value}`),
    ...dependencyTags('author', locale, authorIds),
    ...dependencyTags('category', locale, categoryIds),
    ...dependencyTags('regulation', locale, regulationIds),
    ...dependencyTags('media', locale, mediaIds),
  ])
}

export function serviceTags({ slug, previousSlug, locales, regulationIds = [] }: ServiceTagInput) {
  return forLocales(locales, (locale) => [
    `services:${locale}`,
    ...orderedUnique([slug, previousSlug]).map((value) => `service:${locale}:${value}`),
    `pricing:${locale}`,
    ...dependencyTags('regulation', locale, regulationIds),
  ])
}

export function authorTags({ id, previousId, locales }: DetailTagInput) {
  return forLocales(locales, (locale) => [
    `authors:${locale}`,
    ...orderedUnique([id, previousId]).map((value) => `author:${locale}:${value}`),
    `insights:${locale}`,
  ])
}

export function categoryTags({ id, previousId, locales }: DetailTagInput) {
  return forLocales(locales, (locale) => [
    `categories:${locale}`,
    ...orderedUnique([id, previousId]).map((value) => `category:${locale}:${value}`),
    `insights:${locale}`,
  ])
}

export function regulationTags({ id, previousId, locales }: DetailTagInput) {
  return forLocales(locales, (locale) => [
    `regulations:${locale}`,
    ...orderedUnique([id, previousId]).map((value) => `regulation:${locale}:${value}`),
    `insights:${locale}`,
    `services:${locale}`,
  ])
}

export function mediaTags({ id, previousId, locales }: DetailTagInput) {
  return forLocales(locales, (locale) => [
    `media:${locale}`,
    ...orderedUnique([id, previousId]).map((value) => `media:${locale}:${value}`),
    `insights:${locale}`,
    `authors:${locale}`,
  ])
}

export function siteTags({ locales }: LocaleTagInput) {
  return sortedUnique(locales).map((locale) => `site:${locale}`)
}
