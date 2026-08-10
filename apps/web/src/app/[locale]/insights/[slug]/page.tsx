import type { ComponentProps } from 'react'
import { unstable_cache as cache } from 'next/cache'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

import { LocalizedLink } from '@/components/LocalizedLink'
import { routing, type Locale } from '@/i18n/routing'
import {
  buildInsightCacheKey,
  formatInsightDate,
  hasRegulations,
  type InsightLocale,
  type RegulationCitation,
} from '@/lib/insightDetail'
import { getPayloadClient } from '@/lib/payload'
import { RichTextRender } from '@/lib/richTextRender'

type Relation<T> = string | number | T | null | undefined

type InsightCategory = {
  id?: string | number
  name?: string | null
}

type InsightAuthor = {
  id?: string | number
  name?: string | null
  role?: string | null
  linkedinUrl?: string | null
}

type InsightRegulation = {
  id: string | number
  code?: string | null
  title?: string | null
  url?: string | null
}

type InsightBody = ComponentProps<typeof RichTextRender>['content']

type InsightDocument = {
  id: string | number
  slug: string
  title: string
  lead: string
  body: InsightBody
  publishedAt: string
  estReadTime?: number | null
  category?: Relation<InsightCategory>
  author?: Relation<InsightAuthor>
  regulationsCited?: Relation<InsightRegulation>[] | null
}

function isPopulated<T>(relation: Relation<T>): relation is T {
  return typeof relation === 'object' && relation !== null
}

function normalizeRegulation(regulation: Relation<InsightRegulation>): RegulationCitation | null {
  if (!isPopulated(regulation)) return null
  if (!regulation.code || !regulation.title || !regulation.url) return null

  return {
    id: regulation.id,
    code: regulation.code,
    title: regulation.title,
    url: regulation.url,
  }
}

const findPublishedInsights = async (locale: InsightLocale, limit = 200) => {
  const payload = await getPayloadClient()

  return payload.find({
    collection: 'insights' as never,
    where: { status: { equals: 'published' } },
    locale,
    depth: 2,
    limit,
  }) as unknown as Promise<{ docs: InsightDocument[] }>
}

const getInsightBySlug = (slug: string, locale: InsightLocale) =>
  cache(
    async () => {
      const payload = await getPayloadClient()
      const res = (await payload.find({
        collection: 'insights' as never,
        where: { slug: { equals: slug }, status: { equals: 'published' } },
        locale,
        depth: 2,
        limit: 1,
      })) as unknown as { docs: InsightDocument[] }

      return res.docs[0] ?? null
    },
    buildInsightCacheKey(slug, locale),
    { tags: [`insights:slug:${slug}`] },
  )()

export async function generateStaticParams() {
  if (process.env.JAKARTABC_BUILD_STATIC_INSIGHTS !== 'true') {
    return []
  }

  try {
    const res = await findPublishedInsights('en')

    return routing.locales.flatMap((locale) =>
      res.docs.map((insight) => ({ locale, slug: insight.slug })),
    )
  } catch {
    return []
  }
}

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!routing.locales.includes(locale as Locale)) notFound()

  const typedLocale = locale as InsightLocale
  setRequestLocale(typedLocale)

  const t = await getTranslations('insightDetail')
  const insight = await getInsightBySlug(slug, typedLocale).catch(() => null)
  if (!insight) notFound()

  const category = isPopulated(insight.category) ? insight.category : null
  const author = isPopulated(insight.author) ? insight.author : null
  const regulations = (insight.regulationsCited ?? [])
    .map(normalizeRegulation)
    .filter((regulation): regulation is RegulationCitation => regulation !== null)

  return (
    <article className="mx-auto max-w-editorial px-24 py-96 md:px-40 md:py-128">
      <header className="mb-64 border-b border-rule-soft pb-48">
        <div className="flex flex-wrap items-center gap-8 text-eyebrow uppercase tracking-[0.08em] text-ink-700">
          {category?.name ? <span>{category.name}</span> : null}
          {category?.name ? <span aria-hidden="true">·</span> : null}
          <time dateTime={insight.publishedAt}>
            {formatInsightDate(insight.publishedAt, typedLocale)}
          </time>
          <span aria-hidden="true">·</span>
          <span>
            {insight.estReadTime ?? 1} {t('minRead')}
          </span>
        </div>

        <DisplayHeading as="h1" size="xl" className="mt-24 text-ink-900">
          {insight.title}
        </DisplayHeading>

        <p className="mt-32 max-w-reading font-display text-body-lg italic leading-relaxed text-ink-700">
          {insight.lead}
        </p>

        {author?.name ? (
          <div className="mt-32 flex items-center gap-16">
            <p className="text-body-sm text-ink-500">
              {t('byline')} <strong className="font-medium text-ink-900">{author.name}</strong>
              {author.role ? <> · {author.role}</> : null}
              {author.linkedinUrl ? (
                <>
                  {' '}
                  ·{' '}
                  <a
                    href={author.linkedinUrl}
                    className="text-ochre-700 underline-offset-4 hover:underline focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ochre-600"
                    rel="noreferrer"
                    target="_blank"
                  >
                    LinkedIn
                  </a>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </header>

      <div className="prose-editorial">
        <RichTextRender content={insight.body} locale={typedLocale} regulations={regulations} />
      </div>

      {hasRegulations(regulations) ? (
        <section className="mt-96 border-t border-rule-soft pt-48">
          <Eyebrow>{t('regulationsCited')}</Eyebrow>
          <ul className="mt-24 space-y-12 text-body-md text-ink-700">
            {regulations.map((regulation) => (
              <li key={regulation.id}>
                <a
                  href={regulation.url}
                  className="text-ochre-700 underline underline-offset-4 hover:text-ochre-600 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ochre-600"
                >
                  {regulation.code} — {regulation.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-96 border-t border-rule-soft pt-32">
        <LocalizedLink
          href="/insights"
          className="text-body-md text-ink-900 underline-offset-4 hover:text-ochre-700 hover:underline focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ochre-600"
        >
          ← {t('relatedHeading')}
        </LocalizedLink>
      </footer>
    </article>
  )
}
