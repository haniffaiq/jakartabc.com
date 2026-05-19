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

const stats = [
  { value: '400+', label: 'Companies set up' },
  { value: '15yr', label: 'Practice in Jakarta' },
  { value: '4.9★', label: 'Avg. client rating' },
  { value: 'BKPM', label: 'Licensed consultant' },
]

const serviceIcons = ['◇', '◆', '◈', '❖']

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  unstable_setRequestLocale(locale as Locale)

  const t = await getTranslations('home')
  const services = t.raw('services') as HomeService[]

  return (
    <main className="bg-bone-50">
      {/* Hero — navy gradient with skyline silhouette */}
      <section className="relative overflow-hidden bg-navy-900 text-bone-50">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 80% 20%, rgba(96,165,250,0.35), transparent 50%),' +
              'radial-gradient(circle at 10% 90%, rgba(176,133,36,0.25), transparent 45%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-32 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to top, rgba(0,0,0,0.55), transparent),' +
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'><path fill='%230b1e3f' d='M0 120 L0 80 L40 80 L40 60 L70 60 L70 40 L100 40 L100 75 L140 75 L140 50 L160 50 L160 30 L185 30 L185 70 L215 70 L215 55 L245 55 L245 35 L270 35 L270 75 L305 75 L305 45 L335 45 L335 25 L360 25 L360 80 L400 80 L400 60 L430 60 L430 35 L460 35 L460 70 L490 70 L490 50 L520 50 L520 30 L550 30 L550 78 L580 78 L580 55 L610 55 L610 40 L640 40 L640 65 L670 65 L670 30 L700 30 L700 72 L730 72 L730 55 L760 55 L760 35 L790 35 L790 80 L820 80 L820 50 L850 50 L850 30 L880 30 L880 70 L910 70 L910 55 L940 55 L940 38 L970 38 L970 75 L1000 75 L1000 50 L1030 50 L1030 30 L1060 30 L1060 70 L1090 70 L1090 55 L1120 55 L1120 35 L1150 35 L1150 75 L1200 75 L1200 120 Z'/></svg>\")",
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'bottom',
            backgroundSize: '1200px 120px',
          }}
        />

        <div className="relative mx-auto max-w-container px-24 pt-96 pb-128 md:px-48 md:pt-128 md:pb-160">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-navy-100">
            {t('eyebrow')}
          </p>
          <h1 className="mt-24 max-w-[820px] font-display text-display-lg font-bold leading-[1.05] tracking-tight md:text-display-xl">
            {t('headline')}
          </h1>
          <p className="mt-24 max-w-reading text-body-lg text-bone-200">{t('lead')}</p>

          <div className="mt-48 flex flex-col gap-16 sm:flex-row sm:items-center sm:gap-24">
            <Button href={localizedPath(locale, '/contact')} variant="primary">
              {t('primaryCta')} →
            </Button>
            <a
              href={localizedPath(locale, '/services')}
              className="inline-flex items-center gap-8 text-body-md font-medium text-bone-100 underline-offset-4 hover:text-bone-50 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-100"
            >
              {t('secondaryCta')} →
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-rule-soft bg-bone-50">
        <div className="mx-auto grid max-w-container grid-cols-2 gap-px overflow-hidden bg-rule-soft md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-start gap-8 bg-bone-50 px-24 py-32 md:px-32 md:py-48">
              <span className="font-display text-display-md font-bold tracking-tight text-navy-900">
                {s.value}
              </span>
              <span className="text-body-sm font-medium uppercase tracking-[0.08em] text-ink-500">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Services — card grid */}
      <section className="mx-auto max-w-container px-24 py-96 md:px-48 md:py-128">
        <div className="flex flex-col gap-16 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-navy-600">
              {t('servicesEyebrow')}
            </p>
            <h2 className="mt-16 max-w-[680px] font-display text-display-md font-bold tracking-tight text-navy-900 md:text-display-lg">
              Four services. End to end.
            </h2>
          </div>
        </div>

        <div className="mt-48 grid gap-24 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <a
              key={service.slug}
              href={localizedPath(locale, `/services/${service.slug}`)}
              className="group flex flex-col gap-16 rounded-md border border-rule-soft bg-bone-50 p-24 transition-all duration-fast hover:-translate-y-1 hover:border-navy-600 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-48 w-48 items-center justify-center rounded-sm bg-navy-100 text-display-md text-navy-700">
                  {serviceIcons[index] ?? '◇'}
                </span>
                <span className="text-body-sm font-medium uppercase tracking-[0.08em] text-ink-500">
                  {service.timeline}
                </span>
              </div>
              <h3 className="font-display text-heading-lg font-semibold text-navy-900">
                {service.title}
              </h3>
              <p className="text-body-md leading-relaxed text-ink-700">{service.desc}</p>
              <span className="mt-auto inline-flex items-center gap-4 text-body-sm font-semibold text-navy-600 group-hover:gap-8 transition-all duration-fast">
                {t('servicesRead')} <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Testimonial — navy block */}
      <section className="bg-navy-800 px-24 py-96 text-bone-100 md:px-48 md:py-128">
        <div className="mx-auto max-w-editorial">
          <span aria-hidden="true" className="block font-display text-display-xl font-bold leading-none text-navy-100/30">
            “
          </span>
          <blockquote className="mt-16 font-display text-display-md font-medium leading-[1.3] text-bone-50 md:text-display-lg">
            {t('quote')}
          </blockquote>
          <div className="mt-32 flex items-center gap-16">
            <span className="flex h-48 w-48 items-center justify-center rounded-full bg-navy-100 font-display text-heading-md font-bold text-navy-900">
              {t('quoteAuthor').toString().charAt(0)}
            </span>
            <div>
              <p className="font-display text-body-md font-semibold text-bone-50">{t('quoteAuthor')}</p>
              <p className="text-body-sm text-bone-200">{t('quoteRole')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-rule-soft bg-bone-100 px-24 py-96 md:px-48 md:py-128">
        <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-32 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-display-md font-bold tracking-tight text-navy-900">
              Ready to start?
            </h2>
            <p className="mt-12 max-w-reading text-body-md text-ink-700">
              30 minutes. No obligation. We&apos;ll tell you exactly what your setup will cost and how long it will take.
            </p>
          </div>
          <Button href={localizedPath(locale, '/contact')} variant="primary">
            {t('primaryCta')} →
          </Button>
        </div>
      </section>
    </main>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
