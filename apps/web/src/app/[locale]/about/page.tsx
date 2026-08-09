import { Button } from '@jakartabc/ui'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { routing, type Locale } from '@/i18n/routing'

type TeamMember = {
  name: string
  role: string
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const t = await getTranslations('about')
  const team = t.raw('team') as TeamMember[]
  const licenses = t.raw('licenses') as string[]
  const isEnglish = locale === 'en'

  return (
    <main>
      <section className="px-24 py-96 md:px-48 md:py-128">
        <div className="mx-auto max-w-editorial">
          <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">{t('eyebrow')}</p>
          <h1 className="mt-24 font-display text-display-lg text-ink-900 md:text-display-xl">
            {t('headline')}
          </h1>
          <p className="mt-32 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>
        </div>
      </section>

      <section className="bg-ink-900 px-24 py-96 text-bone-100 md:px-48 md:py-128">
        <div className="mx-auto max-w-editorial">
          <p className="text-eyebrow uppercase tracking-[0.08em] text-bone-200">
            {t('founderEyebrow')}
          </p>
          <p className="mt-24 font-display text-display-md leading-[1.3] text-bone-100 md:text-display-lg">
            {t('founderNote')}
          </p>
          <img
            src="/images/founder-signature.svg"
            alt=""
            className="mt-32 h-64 w-auto opacity-80"
          />
        </div>
      </section>

      <section className="mx-auto max-w-container px-24 py-96 md:px-48 md:py-128">
        <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">
          {t('teamEyebrow')}
        </p>
        <ul className="mt-24 divide-y divide-ink-900/[0.08]">
          {team.map((member) => (
            <li key={member.name} className="grid grid-cols-1 gap-8 py-24 md:grid-cols-[1fr_2fr]">
              <span className="font-display text-display-md text-ink-900">{member.name}</span>
              <span className="text-body-md text-ink-700">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-container px-24 pb-96 md:px-48 md:pb-128">
        <p className="text-eyebrow uppercase tracking-[0.08em] text-ochre-700">
          {t('licensesEyebrow')}
        </p>
        <ul className="mt-24 space-y-8 border-t border-rule-soft pt-24 text-body-md text-ink-900">
          {licenses.map((license) => (
            <li key={license}>{license}</li>
          ))}
        </ul>
      </section>

      <section className="bg-bone-100 px-24 py-96 md:px-48">
        <div className="mx-auto flex max-w-container flex-col justify-between gap-32 md:flex-row md:items-end">
          <div>
            <p className="text-eyebrow uppercase tracking-[0.08em] text-ink-500">
              {isEnglish ? 'NEXT STEP' : 'LANGKAH BERIKUTNYA'}
            </p>
            <h2 className="mt-16 font-display text-display-md text-ink-900">
              {isEnglish ? 'Talk to a partner' : 'Bicara dengan partner'}
            </h2>
            <p className="mt-16 max-w-reading text-body-md text-ink-700">
              {isEnglish
                ? 'Send one concise note. We will route it to the right partner before the first call.'
                : 'Kirim satu catatan singkat. Kami arahkan ke partner yang tepat sebelum panggilan pertama.'}
            </p>
            <p className="mt-16 text-body-sm text-ink-500">
              Diah Putri · Founder · diah@jakartabc.com · +62-21-555-1234
            </p>
          </div>
          <Button href="mailto:diah@jakartabc.com" variant="primary">
            {isEnglish ? 'Email Diah Putri' : 'Email Diah Putri'} →
          </Button>
        </div>
      </section>
    </main>
  )
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
