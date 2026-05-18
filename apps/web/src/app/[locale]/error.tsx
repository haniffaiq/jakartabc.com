'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    // App errors go to stderr per spec §9.3.
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-reading px-24 py-128">
      <h1 className="font-display text-display-lg text-ink-900">
        {t('errorTitle')}
      </h1>
      <p className="mt-24 text-body-lg text-ink-700">{t('errorBody')}</p>
      <div className="mt-48 flex flex-wrap items-center gap-24">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-sm bg-ochre-600 px-24 py-12 text-body-md font-medium text-bone-50 transition-colors hover:bg-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
        >
          {t('errorRetry')}
        </button>
        <a
          href="mailto:hello@jakartabc.com"
          className="text-body-md text-ochre-700 underline underline-offset-4 transition-colors hover:text-ochre-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
        >
          {t('errorEmail')}
        </a>
      </div>
    </main>
  )
}
