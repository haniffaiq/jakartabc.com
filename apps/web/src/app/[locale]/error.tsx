'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function LocaleError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorPage')

  useEffect(() => {
    // App errors go to stderr per spec §9.3.
    console.error(error)
  }, [error])

  const email = t('emailLabel')

  return (
    <main className="mx-auto max-w-reading px-24 py-128 md:px-40 md:py-160">
      <p className="text-eyebrow uppercase tracking-[0.08em] text-danger">500</p>
      <h1 className="mt-24 font-display text-display-lg text-ink-900">{t('headline')}</h1>
      <p className="mt-24 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>
      <p className="mt-48 text-body-md">
        <a
          href={`mailto:${email}`}
          className="text-ochre-700 underline underline-offset-4 transition-colors hover:text-ochre-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
        >
          {email}
        </a>
      </p>
    </main>
  )
}
