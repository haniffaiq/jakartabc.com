import { Button } from '@jakartabc/ui'
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import { routing, type Locale } from '@/i18n/routing'

type HomeService = {
  slug: string
  title: string
  desc: string
  timeline: string
}

function localizedPath(locale: string, path: string) {
  return locale === 'en' ? path : `/id${path === '/' ? '' : path}`
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  unstable_setRequestLocale(locale as Locale)

  const t = await getTranslations('home')
  const services = t.raw('services') as HomeService[]

  return (
    <main>
      <section className="mx-auto max-w-container px-24 py-128 md:px-48 md:py-160">
        <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">{t('eyebrow')}</p>

        <h1 className="mt-24 max-w-[820px] font-display text-display-lg text-ink-900 md:text-display-xl">
          {t('headline')}
        </h1>

        <p className="mt-32 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>

        <div className="mt-48 flex flex-col gap-16 sm:flex-row sm:items-center sm:gap-24">
          <Button href={localizedPath(locale, '/contact')} variant="primary">
            {t('primaryCta')} →
          </Button>
          <Button href={localizedPath(locale, '/services')} variant="ghost">
            {t('secondaryCta')}
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-container px-24 py-96 md:px-48 md:py-128">
        <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">
          {t('servicesEyebrow')}
        </p>
        <div className="mt-16 border-t border-rule-firm" />

        <ol className="divide-y divide-rule-soft">
          {services.map((service, index) => (
            <li
              key={service.slug}
              className="grid gap-16 py-32 md:grid-cols-[80px_1fr_auto] md:items-start"
            >
              <span className="font-mono text-mono-sm tabular-nums text-ink-500">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="flex flex-col gap-8 md:flex-row md:items-baseline md:justify-between">
                  <h2 className="font-display text-display-md text-ink-900">{service.title}</h2>
                  <span className="font-mono text-mono-sm tabular-nums text-ink-500">
                    {service.timeline}
                  </span>
                </div>
                <p className="mt-8 max-w-reading text-body-md text-ink-700">{service.desc}</p>
              </div>
              <a
                href={localizedPath(locale, `/services/${service.slug}`)}
                className="self-start text-body-sm text-ochre-700 underline underline-offset-4 transition-colors duration-fast hover:text-ochre-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
              >
                {t('servicesRead')} →
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-ink-900 px-24 py-96 text-bone-100 md:px-48 md:py-128">
        <div className="mx-auto max-w-editorial">
          <blockquote className="font-display text-display-md leading-[1.3] md:text-display-lg">
            “{t('quote')}”
          </blockquote>
          <p className="mt-24 text-body-md text-bone-200">
            {t('quoteAuthor')} · {t('quoteRole')}
          </p>
        </div>
      </section>
    </main>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
