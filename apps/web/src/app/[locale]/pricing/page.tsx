import { Button } from '@jakartabc/ui'
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import { getPathname, routing, type Locale } from '@/i18n/routing'

type PricingRow = {
  service: string
  govFee: number
  ourFee: number
}

type TableHeaders = {
  service: string
  govFee: string
  ourFee: string
  total: string
}

function formatIdr(value: number, locale: Locale) {
  if (value === 0) return '—'

  return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: 'IDR',
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  unstable_setRequestLocale(locale)

  const t = await getTranslations('pricing')
  const headers = t.raw('tableHeaders') as TableHeaders
  const rows = t.raw('rows') as PricingRow[]

  return (
    <main className="mx-auto max-w-container px-24 py-96 md:py-128">
      <section aria-labelledby="pricing-heading">
        <p className="text-eyebrow uppercase text-ochre-700">{t('eyebrow')}</p>

        <h1
          id="pricing-heading"
          className="mt-24 max-w-reading font-display text-display-lg text-ink-900"
        >
          {t('headline')}
        </h1>

        <p className="mt-32 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>

        <div className="mt-64 overflow-x-auto border-y border-rule-soft">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">{t('headline')}</caption>
            <thead>
              <tr className="border-b border-rule-firm text-eyebrow uppercase text-ink-500">
                <th className="py-16 pr-24 font-body font-medium" scope="col">
                  {headers.service}
                </th>
                <th className="px-24 py-16 font-body font-medium" scope="col">
                  {headers.govFee}
                </th>
                <th className="px-24 py-16 font-body font-medium" scope="col">
                  {headers.ourFee}
                </th>
                <th className="py-16 pl-24 font-body font-medium" scope="col">
                  {headers.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const total = row.govFee + row.ourFee

                return (
                  <tr
                    key={row.service}
                    className={index % 2 === 0 ? 'bg-bone-50' : 'bg-bone-100'}
                  >
                    <th className="py-20 pr-24 text-body-md font-medium text-ink-900" scope="row">
                      {row.service}
                    </th>
                    <td className="px-24 py-20 font-mono text-body-sm tabular-nums text-ink-700">
                      {formatIdr(row.govFee, locale)}
                    </td>
                    <td className="px-24 py-20 font-mono text-body-sm tabular-nums text-ink-700">
                      {formatIdr(row.ourFee, locale)}
                    </td>
                    <td className="py-20 pl-24 font-mono text-body-sm tabular-nums text-ink-900">
                      {formatIdr(total, locale)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-24 text-body-sm uppercase tracking-[0.08em] text-ink-500">
          {t('starter')}
        </p>
        <p className="mt-12 max-w-reading text-body-sm text-ink-500">{t('footnote')}</p>

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
