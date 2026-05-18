import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import { Link, routing, type Locale } from '@/i18n/routing'

type ServiceListItem = {
  slug: string
  title: string
  desc: string
  timeline: string
}

export default async function ServicesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  unstable_setRequestLocale(locale as Locale)

  const t = await getTranslations('services')
  const list = t.raw('list') as ServiceListItem[]

  return (
    <main>
      <section className="px-24 py-96 md:px-48 md:py-128">
        <div className="mx-auto max-w-editorial">
          <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">{t('eyebrow')}</p>
          <h1 className="mt-24 font-display text-display-lg text-ink-900 md:text-display-xl">
            {t('headline')}
          </h1>
          <p className="mt-32 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>
        </div>
      </section>

      <section className="mx-auto max-w-container px-24 pb-96 md:px-48 md:pb-128">
        <div className="border-t border-rule-firm">
          <ol className="divide-y divide-rule-soft">
            {list.map((item, index) => (
              <li
                key={item.slug}
                className="grid grid-cols-1 gap-16 py-32 md:grid-cols-[80px_1fr_auto] md:items-start md:gap-24"
              >
                <span className="font-mono text-mono-sm tabular-nums text-ink-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="font-display text-display-md text-ink-900">{item.title}</h2>
                  <p className="mt-8 max-w-reading text-body-md text-ink-700">{item.desc}</p>
                  <Link
                    href={`/services/${item.slug}`}
                    className="mt-16 inline-block text-body-sm font-medium text-ochre-700 underline decoration-ochre-600/40 underline-offset-4 hover:text-ochre-600"
                  >
                    {t('readLabel')} →
                  </Link>
                </div>
                <span className="font-mono text-mono-sm tabular-nums text-ink-500 md:pt-8">
                  {item.timeline}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
