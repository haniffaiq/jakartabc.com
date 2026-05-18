import { notFound } from 'next/navigation'
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import { MdxBody } from '@/components/MdxBody'
import { Link, routing, type Locale } from '@/i18n/routing'
import { listServiceSlugs, loadServiceMdx } from '@/lib/mdx'

const tocIds = ['overview', 'who-for', 'requirements', 'timeline', 'cost', 'faq'] as const

export async function generateStaticParams() {
  const slugs = await listServiceSlugs()

  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })))
}

function formatIdr(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!routing.locales.includes(locale as Locale)) notFound()

  unstable_setRequestLocale(locale)

  const t = await getTranslations('serviceDetail')
  const mdx = await loadServiceMdx(slug, locale as Locale).catch(() => null)
  if (!mdx) notFound()

  const tocItems = tocIds.map((id) => ({ id, label: t(id === 'who-for' ? 'whoFor' : id) }))
  const pricing = mdx.frontmatter.pricing
  const total = pricing ? pricing.govFee + pricing.ourFee : 0

  return (
    <article className="mx-auto max-w-container px-24 py-96 md:px-40">
      <header className="mb-96 max-w-reading">
        <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">
          {slug.replace(/-/g, ' ')}
        </p>
        <h1 className="mt-24 font-display text-display-lg text-ink-900 md:text-display-xl">
          {mdx.frontmatter.title}
        </h1>
        <p className="mt-32 text-body-lg leading-relaxed text-ink-700">
          {mdx.frontmatter.leadParagraph}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-64 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-96 md:self-start">
          <p className="text-eyebrow uppercase tracking-[0.08em] text-ink-500">
            {t('tocHeading')}
          </p>
          <nav aria-label={t('tocHeading')} className="mt-16 border-l border-rule-soft pl-16">
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block py-8 text-body-sm text-ink-700 hover:text-ochre-700"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/contact"
            className="mt-32 inline-flex rounded-sm bg-ochre-600 px-24 py-12 text-body-md font-medium text-bone-50 hover:bg-ochre-700"
          >
            {t('ctaBook')} →
          </Link>
        </aside>

        <div>
          <MdxBody source={mdx.content} />

          {pricing ? (
            <section id="cost" className="mt-96 scroll-mt-24">
              <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">{t('cost')}</p>
              <div className="mt-24 overflow-x-auto border-y border-rule-soft">
                <table className="w-full min-w-[520px] border-collapse text-left text-body-md tabular-nums">
                  <thead className="text-eyebrow uppercase tracking-[0.08em] text-ink-500">
                    <tr>
                      <th className="py-16 pr-24 font-medium">Service</th>
                      <th className="py-16 pr-24 font-medium">Gov. fee</th>
                      <th className="py-16 pr-24 font-medium">Our fee</th>
                      <th className="py-16 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-900">
                    <tr className="border-t border-rule-soft">
                      <td className="py-16 pr-24">{mdx.frontmatter.title}</td>
                      <td className="py-16 pr-24">{formatIdr(pricing.govFee)}</td>
                      <td className="py-16 pr-24">{formatIdr(pricing.ourFee)}</td>
                      <td className="py-16 font-medium text-ochre-700">{formatIdr(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <section className="mt-128 border-t border-rule-soft pt-48">
        <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">
          {locale === 'en' ? 'Next step' : 'Langkah berikutnya'}
        </p>
        <h2 className="mt-16 font-display text-display-md text-ink-900">
          {locale === 'en' ? 'Talk to a Jakarta partner.' : 'Bicara dengan partner Jakarta.'}
        </h2>
        <p className="mt-16 max-w-reading text-body-md text-ink-700">
          {locale === 'en'
            ? 'Diah Putri, Senior Consultant, will confirm scope, timeline, and documents before you commit.'
            : 'Diah Putri, Konsultan Senior, akan mengonfirmasi ruang lingkup, timeline, dan dokumen sebelum Anda berkomitmen.'}
        </p>
        <Link
          href="/contact"
          className="mt-32 inline-flex rounded-sm border border-ink-900 px-24 py-12 text-body-md font-medium text-ink-900 hover:bg-bone-100"
        >
          {t('ctaBook')}
        </Link>
      </section>
    </article>
  )
}
