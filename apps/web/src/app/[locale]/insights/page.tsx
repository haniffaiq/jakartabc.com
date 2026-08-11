import React from 'react'
import { DisplayHeading, Eyebrow, InsightCard } from '@jakartabc/ui'
import { unstable_cache as cache } from 'next/cache'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { LocalizedLink } from '@/components/LocalizedLink'
import { type Locale, routing } from '@/i18n/routing'
import { buildInsightCacheTags } from '@/lib/insightDetail'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

type InsightCategory = {
  name?: string | null
}

type PayloadInsight = {
  id: string | number
  slug?: string | null
  title?: string | null
  lead?: string | null
  publishedAt?: string | null
  estReadTime?: number | null
  category?: string | InsightCategory | null
}

type PayloadFind = (args: {
  collection: 'insights'
  sort: string
  where: { _status: { equals: 'published' } }
  locale: Locale
  depth: number
  limit: number
}) => Promise<{ docs: PayloadInsight[] }>

export const getInsights = (locale: Locale) =>
  cache(
    async () => {
      const payload = await getPayloadClient()
      const res = await (payload.find as PayloadFind)({
        collection: 'insights',
        sort: '-publishedAt',
        where: { _status: { equals: 'published' } },
        locale,
        depth: 1,
        limit: 50,
      })

      return res.docs
    },
    [`insights-list-${locale}`],
    { tags: buildInsightCacheTags(locale) },
  )()

function getCategoryName(category: PayloadInsight['category']) {
  if (!category || typeof category === 'string') return ''
  return category.name ?? ''
}

function getPublishedDate(value: string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10)
  return value.slice(0, 10)
}

export default async function InsightsListPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const safeLocale = routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale
  setRequestLocale(safeLocale)
  const t = await getTranslations('insights')
  const insights = await getInsights(safeLocale)

  return (
    <section className="px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-container">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-6">
          {t('headline')}
        </DisplayHeading>
        <p className="mt-8 max-w-prose text-body-lg text-ink-700">{t('lead')}</p>

        {insights.length === 0 ? (
          <p className="mt-16 max-w-prose border-t border-rule-soft pt-8 text-body-md text-ink-500">
            {t('empty')}
          </p>
        ) : (
          <div className="mt-16">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                category={getCategoryName(insight.category)}
                date={getPublishedDate(insight.publishedAt)}
                readTime={insight.estReadTime ?? 1}
                title={insight.title ?? ''}
                lead={insight.lead ?? ''}
                href={`/insights/${insight.slug ?? insight.id}`}
                Link={LocalizedLink}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
