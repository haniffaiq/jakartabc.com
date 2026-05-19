import { notFound } from 'next/navigation'
import { unstable_cache as cache } from 'next/cache'
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server'

import {
  ContactBlock,
  DisplayHeading,
  EditorialTimeline,
  Eyebrow,
  PricingTable,
  StickyTOC,
} from '@jakartabc/ui'

import { BookingFormWired } from '@/components/BookingFormWired'
import { getPathname, routing, type Locale } from '@/i18n/routing'
import { getPayloadClient } from '@/lib/payload'
import { RichTextRender } from '@/lib/richTextRender'

type Relation<T> = number | string | T

type ServiceRegulation = {
  id: number | string
  code?: string | null
  title?: string | null
  url?: string | null
}

type ServicePricing = {
  govFee?: number | null
  ourFee?: number | null
  currency?: string | null
}

type RichTextContent = Parameters<typeof RichTextRender>[0]['content']

type ServiceDetail = {
  id?: number | string
  slug: string
  name?: string | null
  leadParagraph?: string | null
  overview?: RichTextContent | null
  whoFor?: { persona?: string | null; desc?: string | null }[] | null
  requirements?: { label?: string | null }[] | null
  timelineSteps?:
    | {
        week?: string | null
        label?: string | null
        who?: 'we' | 'joint' | 'you' | null
        docs?: { doc?: string | null }[] | null
      }[]
    | null
  pricing?: ServicePricing | null
  faq?: { q?: string | null; a?: string | null }[] | null
  regulationsCited?: Relation<ServiceRegulation>[] | null
}

type PayloadServicesClient = {
  find(args: {
    collection: 'services'
    where?: { slug?: { equals: string } }
    sort?: string
    locale?: Locale
    limit: number
    depth?: number
  }): Promise<{ docs: ServiceDetail[] }>
}

const tocIds = ['overview', 'who-for', 'requirements', 'timeline', 'cost', 'faq'] as const

async function getServicesClient() {
  return (await getPayloadClient()) as unknown as PayloadServicesClient
}

export const getServiceBySlug = (slug: string, locale: Locale) =>
  cache(
    async () => {
      const payload = await getServicesClient()
      const res = await payload.find({
        collection: 'services',
        where: { slug: { equals: slug } },
        locale,
        limit: 1,
        depth: 2,
      })
      return res.docs[0] ?? null
    },
    [`service-${slug}-${locale}`],
    { tags: [`services:slug:${slug}`] },
  )()

function isRegulation(regulation: Relation<ServiceRegulation>): regulation is ServiceRegulation {
  return typeof regulation === 'object' && regulation !== null && 'id' in regulation
}

function getRegulations(regulations: ServiceDetail['regulationsCited'] = []) {
  return (regulations ?? []).filter(isRegulation).map((regulation) => ({
    id: regulation.id,
    code: regulation.code ?? '',
    title: regulation.title ?? '',
    url: regulation.url ?? '#',
  }))
}

function getTimelineSteps(service: ServiceDetail) {
  return (service.timelineSteps ?? [])
    .filter((step) => step.week && step.label && step.who)
    .map((step) => ({
      week: step.week as string,
      label: step.label as string,
      who: step.who as 'we' | 'joint' | 'you',
      docs: (step.docs ?? []).map((doc) => doc.doc).filter((doc): doc is string => Boolean(doc)),
    }))
}

export async function generateStaticParams() {
  const payload = await getServicesClient()
  const services = await payload.find({ collection: 'services', sort: 'order', limit: 100 })

  return routing.locales.flatMap((locale) =>
    services.docs.map((service) => ({ locale, slug: service.slug })),
  )
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: localeParam, slug } = await params
  if (!routing.locales.includes(localeParam as Locale)) notFound()

  const locale = localeParam as Locale
  unstable_setRequestLocale(locale)

  const t = await getTranslations('serviceDetail')
  const service = await getServiceBySlug(slug, locale)
  if (!service) notFound()

  const regulations = getRegulations(service.regulationsCited)
  const timelineSteps = getTimelineSteps(service)
  const tocItems = tocIds.map((id) => ({ id, label: t(id === 'who-for' ? 'whoFor' : id) }))
  const pricing = service.pricing
  const pricingRows = pricing
    ? [
        {
          label: service.name ?? slug,
          govFee: pricing.govFee ?? 0,
          ourFee: pricing.ourFee ?? 0,
        },
      ]
    : []
  const timelineLabels = t.raw('timelineLabels') as { we: string; joint: string; you: string }

  return (
    <article className="mx-auto max-w-container px-24 py-96 md:px-48 md:py-128">
      <header className="mb-96 max-w-reading">
        <Eyebrow>{slug.replace(/-/g, ' ')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-24 md:text-display-xl">
          {service.name}
        </DisplayHeading>
        {service.leadParagraph ? (
          <p className="mt-32 text-body-lg leading-relaxed text-ink-700">{service.leadParagraph}</p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-64 md:grid-cols-[220px_1fr]">
        <StickyTOC
          heading={t('tocHeading')}
          items={tocItems}
          primaryCta={{ label: t('ctaBook'), href: getPathname({ href: '/contact', locale }) }}
        />

        <div className="max-w-reading">
          {service.overview ? (
            <section id="overview" className="scroll-mt-24">
              <Eyebrow>{t('overview')}</Eyebrow>
              <RichTextRender content={service.overview} regulations={regulations} />
            </section>
          ) : null}

          {service.whoFor?.length ? (
            <section id="who-for" className="mt-96 scroll-mt-24">
              <Eyebrow>{t('whoFor')}</Eyebrow>
              <ul className="mt-24 space-y-16">
                {service.whoFor.map((item) => (
                  <li key={item.persona}>
                    <h2 className="font-body text-body-lg font-medium text-ink-900">
                      {item.persona}
                    </h2>
                    {item.desc ? (
                      <p className="mt-4 text-body-md text-ink-700">{item.desc}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {service.requirements?.length ? (
            <section id="requirements" className="mt-96 scroll-mt-24">
              <Eyebrow>{t('requirements')}</Eyebrow>
              <ul className="mt-24 list-disc space-y-8 pl-24 text-body-md text-ink-700">
                {service.requirements.map((requirement, index) => (
                  <li key={`${requirement.label}-${index}`}>{requirement.label}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {timelineSteps.length ? (
            <section id="timeline" className="mt-96 scroll-mt-24">
              <Eyebrow>{t('timeline')}</Eyebrow>
              <div className="mt-24">
                <EditorialTimeline steps={timelineSteps} labels={timelineLabels} />
              </div>
            </section>
          ) : null}

          {pricingRows.length ? (
            <section id="cost" className="mt-96 scroll-mt-24">
              <Eyebrow>{t('cost')}</Eyebrow>
              <div className="mt-24">
                <PricingTable
                  headers={{
                    service: 'Service',
                    govFee: 'Gov. fee',
                    ourFee: 'Our fee',
                    total: 'Total',
                  }}
                  rows={pricingRows}
                  currency={pricing?.currency ?? 'IDR'}
                  totalLabel={locale === 'en' ? 'Starter' : 'Paket Starter'}
                />
              </div>
            </section>
          ) : null}

          {service.faq?.length ? (
            <section id="faq" className="mt-96 scroll-mt-24">
              <Eyebrow>{t('faq')}</Eyebrow>
              <dl className="mt-24 space-y-24">
                {service.faq.map((item, index) => (
                  <div key={`${item.q}-${index}`}>
                    <dt className="font-body text-body-lg font-medium text-ink-900">{item.q}</dt>
                    {item.a ? <dd className="mt-8 text-body-md text-ink-700">{item.a}</dd> : null}
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {regulations.length ? (
            <section className="mt-96 border-t border-rule-soft pt-48">
              <Eyebrow>{t('regulationsCited')}</Eyebrow>
              <ul className="mt-24 space-y-8 text-body-md">
                {regulations.map((regulation) => (
                  <li key={regulation.id}>
                    <a
                      href={regulation.url}
                      className="text-ochre-700 underline decoration-ochre-600/40 underline-offset-4 hover:text-ochre-600"
                    >
                      {regulation.code}
                      {regulation.title ? ` — ${regulation.title}` : null}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <ContactBlock
        className="mt-128"
        heading={locale === 'en' ? 'Talk to a partner' : 'Bicara dengan partner'}
        partner={{
          name: 'Diah Putri',
          role: locale === 'en' ? 'Senior Consultant' : 'Konsultan Senior',
          email: 'diah@jakartabc.com',
          whatsapp: '+62-21-555-1234',
        }}
      />

      <section className="mx-auto mt-96 max-w-reading border border-rule-soft bg-bone-100 p-32 md:p-48">
        <Eyebrow>{locale === 'en' ? 'Book this service' : 'Jadwalkan layanan ini'}</Eyebrow>
        <div className="mt-32">
          <BookingFormWired
            labels={{
              name: locale === 'en' ? 'Name' : 'Nama',
              email: 'Email',
              company: locale === 'en' ? 'Company' : 'Perusahaan',
              phone: locale === 'en' ? 'Phone' : 'Telepon',
              service: locale === 'en' ? 'Service' : 'Layanan',
              preferredWindows: locale === 'en' ? 'Preferred times' : 'Waktu yang disukai',
              message: locale === 'en' ? 'Message' : 'Pesan',
              submit: locale === 'en' ? 'Send request' : 'Kirim permintaan',
              sending: locale === 'en' ? 'Sending…' : 'Mengirim…',
            }}
            services={[{ slug: service.slug, name: service.name ?? slug }]}
            defaultService={service.slug}
            locale={locale}
            successMessage={
              locale === 'en'
                ? "Thanks. We'll reply within 1 business day."
                : 'Terima kasih. Kami balas dalam 1 hari kerja.'
            }
          />
        </div>
      </section>
    </article>
  )
}
