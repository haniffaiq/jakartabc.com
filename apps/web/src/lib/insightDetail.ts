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

export function formatInsightDate(date: string, locale: InsightLocale) {
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

export function hasRegulations(regulations: RegulationCitation[] | null | undefined) {
  return Boolean(regulations?.length)
}
