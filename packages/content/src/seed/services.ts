import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

export const SERVICE_SEEDS = [
  {
    slug: 'pt-pma-setup',
    order: 1,
    name: { en: 'PT PMA Setup', id: 'Pendirian PT PMA' },
    timelineLabel: { en: '4–6 wks', id: '4–6 minggu' },
    leadParagraph: {
      en: 'Foreign-owned company registration in Indonesia, end to end.',
      id: 'Pendirian perusahaan kepemilikan asing di Indonesia, end-to-end.',
    },
    pricing: { govFee: 2_500_000, ourFee: 18_000_000, currency: 'IDR' },
  },
  {
    slug: 'sector-licensing',
    order: 2,
    name: { en: 'Sector Licensing', id: 'Perizinan Sektoral' },
    timelineLabel: { en: '2–8 wks', id: '2–8 minggu' },
    leadParagraph: {
      en: 'OSS, KBLI classification, and sector-specific permits.',
      id: 'OSS, klasifikasi KBLI, dan izin spesifik sektor.',
    },
    pricing: { govFee: 0, ourFee: 4_000_000, currency: 'IDR' },
  },
  {
    slug: 'tax-accounting',
    order: 3,
    name: { en: 'Tax & Accounting', id: 'Pajak & Akuntansi' },
    timelineLabel: { en: 'ongoing', id: 'berjalan' },
    leadParagraph: {
      en: 'Monthly tax filing, payroll, annual reporting.',
      id: 'Pelaporan pajak bulanan, payroll, laporan tahunan.',
    },
    pricing: { govFee: 0, ourFee: 6_000_000, currency: 'IDR' },
  },
  {
    slug: 'investor-kitas',
    order: 4,
    name: { en: 'Investor KITAS', id: 'KITAS Investor' },
    timelineLabel: { en: '3–4 wks', id: '3–4 minggu' },
    leadParagraph: {
      en: 'Residency for foreign shareholders and directors.',
      id: 'Izin tinggal untuk pemegang saham dan direktur asing.',
    },
    pricing: { govFee: 1_500_000, ourFee: 8_000_000, currency: 'IDR' },
  },
] as const

function makeOverview(text: string): {
  root: {
    type: string
    children: { [key: string]: unknown; type: string; version: number }[]
    direction: 'ltr' | 'rtl' | null
    format: ''
    indent: number
    version: number
  }
} {
  return {
    root: {
      type: 'root',
      format: '',
      direction: null,
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          children: [{ text, type: 'text', version: 1 }],
        },
      ],
    },
  }
}

export async function seedServices(payload: Payload) {
  for (const service of SERVICE_SEEDS) {
    const existing = await payload.find({
      collection: 'services',
      where: { slug: { equals: service.slug } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const id = existing.docs[0]?.id
      if (!id) {
        throw new Error(`Existing service ${service.slug} is missing an id`)
      }
      await payload.update({
        collection: 'services',
        id,
        locale: 'en',
        data: {
          name: service.name.en,
          timelineLabel: service.timelineLabel.en,
          leadParagraph: service.leadParagraph.en,
          order: service.order,
          pricing: service.pricing,
          overview: makeOverview(service.leadParagraph.en),
        },
      })
      await payload.update({
        collection: 'services',
        id,
        locale: 'id',
        data: {
          name: service.name.id,
          timelineLabel: service.timelineLabel.id,
          leadParagraph: service.leadParagraph.id,
          overview: makeOverview(service.leadParagraph.id),
        },
      })
      continue
    }

    const created = await payload.create({
      collection: 'services',
      locale: 'en',
      data: {
        slug: service.slug,
        order: service.order,
        name: service.name.en,
        timelineLabel: service.timelineLabel.en,
        leadParagraph: service.leadParagraph.en,
        pricing: service.pricing,
        overview: makeOverview(service.leadParagraph.en),
      },
    })
    await payload.update({
      collection: 'services',
      id: created.id,
      locale: 'id',
      data: {
        name: service.name.id,
        timelineLabel: service.timelineLabel.id,
        leadParagraph: service.leadParagraph.id,
        overview: makeOverview(service.leadParagraph.id),
      },
    })
  }
}

async function main() {
  const { getPayload } = await import('payload')
  const configModulePath = '../../../../apps/web/src/payload.config'
  const config = (await import(configModulePath)).default
  const payload = await getPayload({ config })

  await seedServices(payload)
  console.log('Services seeded')
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      if (error instanceof Error && 'data' in error) {
        console.dir((error as { data: unknown }).data, { depth: null })
      }
      console.error(error)
      process.exit(1)
    })
}
