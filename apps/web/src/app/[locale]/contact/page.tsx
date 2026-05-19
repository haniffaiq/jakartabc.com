import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import { BookingFormWired } from '@/components/BookingFormWired'
import { getPayloadClient } from '@/lib/payload'

type Locale = 'en' | 'id'

type ServiceOption = {
  slug: string
  name?: string | null
}

type PayloadServicesClient = {
  find(args: {
    collection: 'services'
    sort?: string
    locale?: Locale
    limit: number
  }): Promise<{ docs: ServiceOption[] }>
}

function bookingLabels(locale: Locale, t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    name: t('form.name'),
    email: t('form.email'),
    company: t('form.company'),
    phone: locale === 'en' ? 'Phone' : 'Telepon',
    service: locale === 'en' ? 'Service' : 'Layanan',
    preferredWindows: locale === 'en' ? 'Preferred times' : 'Waktu yang disukai',
    message: t('form.message'),
    submit: t('form.submit'),
    sending: t('form.sending'),
  }
}

async function getBookingServices(locale: Locale) {
  const payload = (await getPayloadClient()) as unknown as PayloadServicesClient
  const servicesRes = await payload.find({ collection: 'services', sort: 'order', locale, limit: 50 })

  return servicesRes.docs
    .filter((service): service is { slug: string; name: string } => Boolean(service.slug && service.name))
    .map((service) => ({ slug: service.slug, name: service.name }))
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  unstable_setRequestLocale(locale)

  const t = await getTranslations('contact')
  const services = await getBookingServices(locale)

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
          <BookingFormWired
            labels={bookingLabels(locale, t)}
            services={services}
            locale={locale}
            successMessage={t('successMessage')}
          />
        </div>
      </section>
    </main>
  )
}
