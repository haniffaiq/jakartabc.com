import { insightTags } from '@jakartabc/content/cache/tags'

export type InsightLocale = 'en' | 'id'

export type RegulationCitation = {
  id: string | number
  code: string
  title: string
  url: string
}

export function buildInsightCacheKey(slug: string, locale: InsightLocale) {
  return ['insight', locale, slug]
}

export function buildInsightCacheTags(locale: InsightLocale, slug?: string) {
  return insightTags({ slug, locales: [locale] })
}

export function formatInsightDate(date: string, locale: InsightLocale) {
  const normalizedDate = date.includes('T') ? date : `${date}T00:00:00Z`

  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(normalizedDate))
}

export function hasRegulations(regulations: RegulationCitation[] | null | undefined) {
  return Boolean(regulations?.length)
}
