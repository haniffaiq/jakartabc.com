import { getLocale, getTranslations } from 'next-intl/server'

import { Link, type Locale } from '@/i18n/routing'

const escapeRoutes = ['/', '/services', '/insights'] as const

export default async function LocaleNotFound() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('notFound')

  return (
    <main className="mx-auto max-w-reading px-24 py-128 md:px-40 md:py-160">
      <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">404</p>
      <h1 className="mt-24 font-display text-display-lg text-ink-900">{t('headline')}</h1>
      <p className="mt-24 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>
      <nav aria-label={t('navLabel')} className="mt-48">
        <ul className="flex flex-wrap gap-x-32 gap-y-16 text-body-md text-ochre-700">
          {escapeRoutes.map((href) => (
            <li key={href}>
              <Link
                href={href}
                locale={locale}
                className="underline underline-offset-4 transition-colors hover:text-ochre-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
              >
                {t(href === '/' ? 'home' : href.slice(1))}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
