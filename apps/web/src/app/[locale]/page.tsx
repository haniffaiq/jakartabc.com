import { Button } from '@jakartabc/ui'
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'
import { routing, type Locale } from '@/i18n/routing'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  unstable_setRequestLocale(locale as Locale)
  const t = await getTranslations('home')

  return (
    <main className="mx-auto max-w-container px-24 py-128">
      <p className="text-eyebrow uppercase text-ochre-700">{t('eyebrow')}</p>

      <h1 className="mt-24 font-display text-display-xl text-ink-900">
        {t('headline')}
        <br />
        {t('subheadline')}
      </h1>

      <p className="mt-32 max-w-reading text-body-lg text-ink-700">
        {t('lead')}
      </p>

      <div className="mt-48 flex items-center gap-24">
        <Button variant="primary">{t('ctaPrimary')} →</Button>
        <Button variant="ghost">{t('ctaSecondary')}</Button>
      </div>

      <p
        data-testid="placeholder-note"
        className="mt-128 text-body-sm text-ink-500"
      >
        {t('placeholderNote')}
      </p>
    </main>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
