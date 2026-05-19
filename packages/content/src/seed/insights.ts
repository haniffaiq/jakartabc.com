import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

type Localized<T> = { en: T; id: T }

type LexicalParagraph = {
  type: 'paragraph'
  version: 1
  direction: null
  format: ''
  indent: 0
  children: { type: 'text'; text: string; version: 1 }[]
}

type LexicalBody = {
  root: {
    type: 'root'
    children: LexicalParagraph[]
    direction: null
    format: ''
    indent: 0
    version: 1
  }
}

function lexicalParagraph(text: string): LexicalParagraph {
  return {
    type: 'paragraph',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [{ type: 'text', text, version: 1 }],
  }
}

function lexicalBody(paragraphs: string[]): LexicalBody {
  return {
    root: {
      type: 'root',
      format: '',
      direction: null,
      indent: 0,
      version: 1,
      children: paragraphs.map(lexicalParagraph),
    },
  }
}

export const INSIGHT_CATEGORY_SEEDS = [
  { slug: 'regulation', name: { en: 'Regulation', id: 'Regulasi' } },
  { slug: 'sector', name: { en: 'Sector', id: 'Sektor' } },
  { slug: 'tax', name: { en: 'Tax', id: 'Pajak' } },
] as const

export const INSIGHT_AUTHOR_SEEDS = [
  {
    name: 'Diah Putri',
    role: { en: 'Founder, Senior Consultant', id: 'Founder, Konsultan Senior' },
    email: 'diah@jakartabc.com',
  },
  {
    name: 'Andi Wirawan',
    role: { en: 'Tax & Accounting Lead', id: 'Lead Pajak & Akuntansi' },
    email: 'andi@jakartabc.com',
  },
] as const

export const INSIGHT_ARTICLE_SEEDS = [
  {
    slug: 'bkpm-reg-5-2025-what-changes',
    title: {
      en: 'BKPM Reg 5/2025: What changes for foreign-owned companies',
      id: 'BKPM Reg 5/2025: Apa yang berubah untuk perusahaan asing',
    },
    lead: {
      en: 'Minimum paid-up capital, KBLI classification updates, and what investors should do now.',
      id: 'Modal disetor minimum, pembaruan klasifikasi KBLI, dan langkah investor sekarang.',
    },
    body: {
      en: lexicalBody([
        'BKPM Reg 5/2025 reduces the minimum paid-up capital threshold for PT PMA to IDR 2.5M from the prior IDR 10M.',
        'For most service-sector investors this changes the entry math significantly.',
        'KBLI classification has also been simplified across several categories, making early taxonomy checks more important before submitting through OSS.',
      ]),
      id: lexicalBody([
        'BKPM Reg 5/2025 menurunkan ambang modal disetor minimum PT PMA menjadi IDR 2,5 juta dari sebelumnya IDR 10 juta.',
        'Bagi sebagian besar investor sektor jasa, ini mengubah kalkulasi awal secara signifikan.',
        'Klasifikasi KBLI juga disederhanakan di beberapa kategori, sehingga pemeriksaan taksonomi awal menjadi lebih penting sebelum pengajuan melalui OSS.',
      ]),
    },
    publishedAt: '2026-05-10',
    categorySlug: 'regulation',
    authorName: 'Diah Putri',
  },
  {
    slug: 'fintech-licensing-2026-update',
    title: {
      en: 'Fintech licensing in Indonesia: 2026 update',
      id: 'Lisensi fintech di Indonesia: Update 2026',
    },
    lead: {
      en: 'OJK signals on payment, lending, and digital-asset categories.',
      id: 'Sinyal OJK pada kategori pembayaran, pinjaman, dan aset digital.',
    },
    body: {
      en: lexicalBody([
        'Indonesia’s fintech licensing map continues to separate payment, lending, and digital-asset activities into distinct supervisory tracks.',
        'Founders should confirm which OJK or Bank Indonesia route applies before setting capital, shareholder, and compliance assumptions.',
        'A short pre-application review can prevent weeks of remediation once the formal submission starts.',
      ]),
      id: lexicalBody([
        'Peta perizinan fintech Indonesia terus memisahkan aktivitas pembayaran, pinjaman, dan aset digital ke jalur pengawasan yang berbeda.',
        'Pendiri perlu memastikan jalur OJK atau Bank Indonesia yang berlaku sebelum menetapkan asumsi modal, pemegang saham, dan kepatuhan.',
        'Tinjauan pra-pengajuan yang singkat dapat mencegah berminggu-minggu perbaikan setelah proses formal dimulai.',
      ]),
    },
    publishedAt: '2026-04-22',
    categorySlug: 'sector',
    authorName: 'Andi Wirawan',
  },
  {
    slug: 'pph-25-installments-foreign-investor-primer',
    title: {
      en: 'PPh 25 installments: a primer for foreign investors',
      id: 'Cicilan PPh 25: panduan untuk investor asing',
    },
    lead: {
      en: 'Quarterly mechanics, common errors, and the audit-trigger thresholds we watch.',
      id: 'Mekanika kuartalan, kesalahan umum, dan ambang pemicu audit yang kami pantau.',
    },
    body: {
      en: lexicalBody([
        'PPh 25 installments are often misunderstood because they convert annual tax expectations into recurring prepayments.',
        'Foreign-invested companies should review revenue seasonality, prior-year assessments, and bookkeeping cut-offs before accepting the default installment amount.',
        'The most common errors are stale assumptions after a capital injection, missing reconciliations, and late adjustments after a material contract changes revenue forecasts.',
      ]),
      id: lexicalBody([
        'Cicilan PPh 25 sering disalahpahami karena mengubah ekspektasi pajak tahunan menjadi pembayaran di muka yang berulang.',
        'Perusahaan penanaman modal asing perlu meninjau pola pendapatan musiman, ketetapan tahun sebelumnya, dan batas pembukuan sebelum menerima nominal cicilan default.',
        'Kesalahan paling umum adalah asumsi yang tidak diperbarui setelah injeksi modal, rekonsiliasi yang hilang, dan penyesuaian terlambat setelah kontrak material mengubah proyeksi pendapatan.',
      ]),
    },
    publishedAt: '2026-04-02',
    categorySlug: 'tax',
    authorName: 'Diah Putri',
  },
] as const

async function upsertCategory(payload: Payload, category: (typeof INSIGHT_CATEGORY_SEEDS)[number]) {
  const existing = await payload.find({
    collection: 'categories',
    where: { slug: { equals: category.slug } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    return existing.docs[0]
  }

  const created = await payload.create({
    collection: 'categories',
    locale: 'en',
    data: { slug: category.slug, name: category.name.en },
  })
  await payload.update({
    collection: 'categories',
    id: created.id,
    locale: 'id',
    data: { name: category.name.id },
  })

  return created
}

async function upsertAuthor(payload: Payload, author: (typeof INSIGHT_AUTHOR_SEEDS)[number]) {
  const existing = await payload.find({
    collection: 'authors',
    where: { email: { equals: author.email } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    return existing.docs[0]
  }

  const created = await payload.create({
    collection: 'authors',
    locale: 'en',
    data: { name: author.name, role: author.role.en, email: author.email },
  })
  await payload.update({
    collection: 'authors',
    id: created.id,
    locale: 'id',
    data: { role: author.role.id },
  })

  return created
}

function requireSeedRecord<T extends { id?: string | number }>(
  record: T | undefined,
  label: string,
) {
  if (!record?.id) {
    throw new Error(`Missing required seed dependency: ${label}`)
  }

  return record
}

function localizedArticleData(
  article: (typeof INSIGHT_ARTICLE_SEEDS)[number],
  locale: keyof Localized<unknown>,
) {
  return {
    title: article.title[locale],
    lead: article.lead[locale],
    body: article.body[locale],
  }
}

export async function seedInsights(payload: Payload) {
  for (const category of INSIGHT_CATEGORY_SEEDS) {
    await upsertCategory(payload, category)
  }
  for (const author of INSIGHT_AUTHOR_SEEDS) {
    await upsertAuthor(payload, author)
  }

  for (const article of INSIGHT_ARTICLE_SEEDS) {
    const category = await payload.find({
      collection: 'categories',
      where: { slug: { equals: article.categorySlug } },
      limit: 1,
    })
    const author = await payload.find({
      collection: 'authors',
      where: { name: { equals: article.authorName } },
      limit: 1,
    })
    const existing = await payload.find({
      collection: 'insights',
      where: { slug: { equals: article.slug } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      continue
    }

    const categoryRecord = requireSeedRecord(category.docs[0], `category ${article.categorySlug}`)
    const authorRecord = requireSeedRecord(author.docs[0], `author ${article.authorName}`)
    const created = await payload.create({
      collection: 'insights',
      locale: 'en',
      data: {
        slug: article.slug,
        ...localizedArticleData(article, 'en'),
        category: categoryRecord.id,
        author: authorRecord.id,
        publishedAt: article.publishedAt,
        status: 'published',
      },
    })
    await payload.update({
      collection: 'insights',
      id: created.id,
      locale: 'id',
      data: localizedArticleData(article, 'id'),
    })
  }
}

async function main() {
  const { getPayload } = await import('payload')
  const configModulePath = '../../../../apps/web/src/payload.config'
  const config = (await import(configModulePath)).default
  const payload = await getPayload({ config })

  await seedInsights(payload)
  console.log('Insights seeded')
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
