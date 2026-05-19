import type { ReactNode } from 'react'
import { unstable_cache as cache } from 'next/cache'
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import { DisplayHeading, EditorialList, Eyebrow, RuleDivider } from '@jakartabc/ui'

import { Link, routing, type Locale } from '@/i18n/routing'
import { getPayloadClient } from '@/lib/payload'

type ServiceListItem = {
  slug: string
  name?: string | null
  leadParagraph?: string | null
  timelineLabel?: string | null
}

type PayloadServicesClient = {
  find(args: { collection: 'services'; sort: string; locale: Locale; limit: number }): Promise<{
    docs: ServiceListItem[]
  }>
}

type ServicesListLinkProps = {
  href: string
  className?: string
  children: ReactNode
  'aria-label'?: string
}

function ServicesListLink({
  href,
  className,
  children,
  'aria-label': ariaLabel,
}: ServicesListLinkProps) {
  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}

export const getServices = (locale: Locale) =>
  cache(
    async () => {
      const payload = (await getPayloadClient()) as unknown as PayloadServicesClient
      const res = await payload.find({ collection: 'services', sort: 'order', locale, limit: 50 })
      return res.docs
    },
    [`services-list-${locale}`],
    { tags: ['services:list'] },
  )()

export function toEditorialListItems(services: ServiceListItem[]) {
  return services
    .filter(
      (service) => service.slug && service.name && service.leadParagraph && service.timelineLabel,
    )
    .map((service) => ({
      slug: service.slug,
      title: service.name as string,
      desc: service.leadParagraph as string,
      timeline: service.timelineLabel as string,
    }))
}

export default async function ServicesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  unstable_setRequestLocale(locale)

  const t = await getTranslations('services')
  const services = await getServices(locale)
  const list = toEditorialListItems(services)

  return (
    <main>
      <section className="px-24 py-96 md:px-48 md:py-128">
        <div className="mx-auto max-w-editorial">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-24 md:text-display-xl">
            {t('headline')}
          </DisplayHeading>
          <p className="mt-32 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>
        </div>
      </section>

      <div className="mx-auto max-w-container px-24 md:px-48">
        <RuleDivider weight="firm" />
      </div>

      <section className="pb-96 md:pb-128">
        <EditorialList
          items={list}
          hrefPrefix="/services"
          readLabel={t('readLabel')}
          Link={ServicesListLink}
        />
      </section>
    </main>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
