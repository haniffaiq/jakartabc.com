import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'
import { routing, type Locale } from '@/i18n/routing'

export default async function InsightsListPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  unstable_setRequestLocale(locale as Locale)
  const t = await getTranslations('insights')

  return (
    <main className="mx-auto max-w-editorial px-24 py-128 md:py-160">
      <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">{t('eyebrow')}</p>

      <h1 className="mt-24 font-display text-display-lg text-ink-900">{t('headline')}</h1>

      <p className="mt-32 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>

      <div className="mt-64 border-t border-rule-soft pt-32">
        <p className="max-w-reading text-body-md text-ink-500">{t('empty')}</p>
      </div>
    </main>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
