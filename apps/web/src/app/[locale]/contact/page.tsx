import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import { ContactFormWired } from '@/components/ContactFormWired'

type Locale = 'en' | 'id'

function contactLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    name: t('form.name'),
    email: t('form.email'),
    company: t('form.company'),
    message: t('form.message'),
    submit: t('form.submit'),
    sending: t('form.sending'),
  }
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  unstable_setRequestLocale(locale)

  const t = await getTranslations('contact')

  return (
    <main className="mx-auto max-w-container px-24 py-96 md:py-128">
      <section className="grid grid-cols-1 gap-64 md:grid-cols-2 md:gap-96">
        <div>
          <p className="text-eyebrow uppercase text-ochre-700">{t('eyebrow')}</p>
          <h1 className="mt-24 font-display text-display-lg text-ink-900">{t('headline')}</h1>
          <p className="mt-32 max-w-reading text-body-lg text-ink-700">{t('lead')}</p>

          <div className="mt-64 border-t border-rule-soft pt-32">
            <p className="text-eyebrow uppercase text-ink-500">{t('officeEyebrow')}</p>
            <p className="mt-16 max-w-reading text-body-md text-ink-700">{t('officeAddress')}</p>
          </div>
        </div>

        <div className="border border-rule-soft bg-bone-100 p-32">
          <ContactFormWired
            labels={contactLabels(t)}
            locale={locale}
            successMessage={t('successMessage')}
          />
        </div>
      </section>
    </main>
  )
}
