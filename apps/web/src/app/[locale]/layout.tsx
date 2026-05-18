import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { Fraunces, Inter } from 'next/font/google'
import { getMessages, getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import { LocalizedLayoutChrome } from '@/components/LocalizedLayoutChrome'
import { routing, type Locale } from '@/i18n/routing'

import '../globals.css'

export const metadata = {
  title: 'Jakarta Business Center',
  description: 'Foreign company registration and market entry consulting in Indonesia.',
}

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500'],
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as Locale)) notFound()

  unstable_setRequestLocale(locale)
  const messages = await getMessages()
  const nav = await getTranslations('nav')
  const footer = await getTranslations('footer')

  return (
    <html lang={locale} className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocalizedLayoutChrome
            locale={locale as Locale}
            nav={{
              services: nav('services'),
              insights: nav('insights'),
              about: nav('about'),
              pricing: nav('pricing'),
              cta: nav('cta'),
            }}
            footer={{
              address: footer.raw('address') as string[],
              email: footer('email'),
              licenses: footer.raw('licenses') as string[],
            }}
          >
            {children}
          </LocalizedLayoutChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
