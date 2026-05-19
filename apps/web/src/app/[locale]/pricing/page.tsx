import { Button, DisplayHeading, Eyebrow, PricingTable } from '@jakartabc/ui'
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'
import { unstable_cache as cache } from 'next/cache'

import { getPathname, routing, type Locale } from '@/i18n/routing'
import { getPayloadClient } from '@/lib/payload'

type TableHeaders = {
  service: string
  govFee: string
  ourFee: string
  total: string
}

type ServicePricing = {
  govFee?: number | null
  ourFee?: number | null
  currency?: string | null
}

type ServiceForPricing = {
  name?: string | null
  pricing?: ServicePricing | null
}

type PayloadPricingClient = {
  find(args: { collection: 'services'; sort: string; locale: Locale; limit: number }): Promise<{
    docs: ServiceForPricing[]
  }>
}

export const getServicesForPricing = (locale: Locale) =>
  cache(
    async () => {
      const payload = (await getPayloadClient()) as unknown as PayloadPricingClient
      const res = await payload.find({ collection: 'services', sort: 'order', locale, limit: 100 })
      return res.docs
    },
    [`pricing-${locale}`],
    { tags: ['pricing', 'services:list'] },
  )()

export function toPricingRows(services: ServiceForPricing[]) {
  return services
    .filter((service) => {
      const pricing = service.pricing
      return Boolean(
        service.name && pricing && ((pricing.govFee ?? 0) > 0 || (pricing.ourFee ?? 0) > 0),
      )
    })
    .map((service) => ({
      label: service.name as string,
      govFee: service.pricing?.govFee ?? 0,
      ourFee: service.pricing?.ourFee ?? 0,
    }))
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  unstable_setRequestLocale(locale)

  const t = await getTranslations('pricing')
  const headers = t.raw('tableHeaders') as TableHeaders
  const services = await getServicesForPricing(locale)
  const rows = toPricingRows(services)
  const currency = services.find((service) => service.pricing?.currency)?.pricing?.currency ?? 'IDR'

  return (
    <main className="mx-auto max-w-container px-24 py-96 md:py-128">
      <section aria-labelledby="pricing-heading">
        <Eyebrow>{t('eyebrow')}</Eyebrow>

        <DisplayHeading id="pricing-heading" size="lg" className="mt-24 max-w-reading">
          {t('headline')}
        </DisplayHeading>

        <p className="mt-32 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>

        <div className="mt-64">
          <PricingTable
            headers={headers}
            rows={rows}
            currency={currency}
            totalLabel={t('starter')}
          />
        </div>

        <p className="mt-24 max-w-reading text-body-sm text-ink-500">{t('footnote')}</p>

        <div className="mt-48">
          <Button href={getPathname({ href: '/contact', locale })} variant="primary">
            {t('ctaQuote')} →
          </Button>
        </div>
      </section>
    </main>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
