import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'id'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing)

export function getPathname({
  href,
  locale = routing.defaultLocale,
}: {
  href: string
  locale?: Locale
}) {
  if (locale === routing.defaultLocale) return href
  return href === '/' ? `/${locale}` : `/${locale}${href}`
}
