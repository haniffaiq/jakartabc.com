import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function LocaleNotFound() {
  const t = await getTranslations('errors')

  return (
    <main className="mx-auto max-w-reading px-24 py-128">
      <h1 className="font-display text-display-lg text-ink-900">
        {t('notFoundTitle')}
      </h1>
      <p className="mt-24 text-body-lg text-ink-700">{t('notFoundBody')}</p>
      <p className="mt-48">
        <Link
          href="/"
          className="text-body-md text-ochre-700 underline underline-offset-4 transition-colors hover:text-ochre-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
        >
          {t('notFoundHome')} →
        </Link>
      </p>
    </main>
  )
}
