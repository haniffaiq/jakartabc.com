import { expect, test, type Page } from '@playwright/test'
import { getPayload, type Payload } from 'payload'

import { seedInsights } from '../../../packages/content/src/seed/insights'
import { seedServices } from '../../../packages/content/src/seed/services'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@jakartabc.com'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'changeme-test'

let payload: Payload | null = null

type LexicalBody = {
  root: {
    type: 'root'
    format: ''
    direction: null
    indent: 0
    version: 1
    children: {
      type: 'paragraph'
      version: 1
      direction: null
      format: ''
      indent: 0
      children: { type: 'text'; text: string; version: 1 }[]
    }[]
  }
}

function lexicalBody(text: string): LexicalBody {
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
          children: [{ type: 'text', text, version: 1 }],
        },
      ],
    },
  }
}

async function ensureEditorialFixtures() {
  process.env.DATABASE_URL ??= 'postgres://jakartabc:jakartabc@localhost:5432/jakartabc'
  process.env.PAYLOAD_SECRET ??= 'ci-secret-32-chars-minimum-padding-xx'
  process.env.NEXT_PUBLIC_SITE_URL ??= 'http://127.0.0.1:3000'
  process.env.REVALIDATE_SECRET ??= 'ci-revalidate-secret'
  process.env.DEFAULT_LOCALE ??= 'en'

  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })

  const existingAdmin = await payload.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
  })

  if (existingAdmin.docs[0]?.id) {
    await payload.update({
      collection: 'users',
      id: existingAdmin.docs[0].id,
      data: {
        name: 'Jakarta BC E2E Editor',
        password: ADMIN_PASS,
        role: 'admin',
      },
    })
  } else {
    await payload.create({
      collection: 'users',
      data: {
        email: ADMIN_EMAIL,
        name: 'Jakarta BC E2E Editor',
        password: ADMIN_PASS,
        role: 'admin',
      },
    })
  }

  await seedServices(payload)
  await seedInsights(payload)
}

async function loginAsEditor(page: Page) {
  const loginResponse = await page.request.post('/api/users/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  })

  expect(loginResponse.ok()).toBe(true)

  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin/)
  await expect(page.getByLabel(/email/i)).toBeHidden()
}

async function publishBilingualInsightViaCmsApi(
  page: Page,
  slug: string,
  englishTitle: string,
  indonesianTitle: string,
) {
  const result = await page.evaluate(
    async ({ slug, englishTitle, indonesianTitle, englishBody, indonesianBody }) => {
      const [categories, authors] = await Promise.all([
        fetch('/api/categories?limit=1', { credentials: 'include' }).then((response) =>
          response.json(),
        ),
        fetch('/api/authors?limit=1', { credentials: 'include' }).then((response) =>
          response.json(),
        ),
      ])

      const categoryId = categories.docs?.[0]?.id
      const authorId = authors.docs?.[0]?.id
      if (!categoryId || !authorId) {
        throw new Error('Missing seeded category or author fixture')
      }

      const createResponse = await fetch('/api/insights?locale=en&draft=false', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: englishTitle,
          lead: 'A short lead for the e2e test.',
          body: englishBody,
          category: categoryId,
          author: authorId,
          publishedAt: '2026-05-18',
          status: 'published',
          _status: 'published',
        }),
      })
      const created = await createResponse.json()
      if (!createResponse.ok) {
        throw new Error(`Create Insight failed: ${JSON.stringify(created)}`)
      }

      const updateResponse = await fetch(`/api/insights/${created.doc.id}?locale=id&draft=false`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: indonesianTitle,
          lead: 'Lead pendek untuk uji e2e.',
          body: indonesianBody,
          status: 'published',
          _status: 'published',
        }),
      })
      const updated = await updateResponse.json()
      if (!updateResponse.ok) {
        throw new Error(`Localize Insight failed: ${JSON.stringify(updated)}`)
      }

      return { id: created.doc.id, slug: created.doc.slug }
    },
    {
      slug,
      englishTitle,
      indonesianTitle,
      englishBody: lexicalBody('English editorial body for the e2e test.'),
      indonesianBody: lexicalBody('Isi editorial Indonesia untuk uji e2e.'),
    },
  )

  expect(result.slug).toBe(slug)
}

async function updateServiceIdNameViaCmsApi(page: Page, newName: string) {
  const result = await page.evaluate(
    async ({ newName }) => {
      const services = await fetch(
        '/api/services?limit=1&where[slug][equals]=pt-pma-setup&locale=en',
        { credentials: 'include' },
      ).then((response) => response.json())
      const serviceId = services.docs?.[0]?.id
      if (!serviceId) {
        throw new Error('Missing seeded PT PMA service fixture')
      }

      const updateResponse = await fetch(`/api/services/${serviceId}?locale=id&draft=false`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      const updated = await updateResponse.json()
      if (!updateResponse.ok) {
        throw new Error(`Update Service failed: ${JSON.stringify(updated)}`)
      }

      return { id: updated.doc.id, name: updated.doc.name }
    },
    { newName },
  )

  expect(result.name).toBe(newName)
}

test.beforeAll(async () => {
  await ensureEditorialFixtures()
})

test.afterAll(async () => {
  const destroy = (payload as { destroy?: () => Promise<void> } | null)?.destroy
  await destroy?.()
})

test.describe('CMS editorial flow', () => {
  test.describe.configure({ timeout: 90_000 })

  test('editor logs in and creates an Insight in EN + ID, publishes, public page renders both', async ({
    page,
  }) => {
    const slug = `e2e-test-article-${Date.now()}`
    const englishTitle = 'E2E Test Article'
    const indonesianTitle = 'Artikel Uji E2E'

    await loginAsEditor(page)

    await publishBilingualInsightViaCmsApi(page, slug, englishTitle, indonesianTitle)

    await page.goto(`/insights/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(englishTitle)
    await expect(page.getByText('A short lead for the e2e test.')).toBeVisible()

    await page.goto(`/id/insights/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(indonesianTitle)
    await expect(page.getByText('Lead pendek untuk uji e2e.')).toBeVisible()
  })

  test('editor updates Service ID name, /id/services reflects after revalidate', async ({
    page,
  }) => {
    await loginAsEditor(page)

    const newName = `Pendirian PT PMA · ${Date.now()}`
    await updateServiceIdNameViaCmsApi(page, newName)

    // Public page should reflect after the Services afterChange hook posts to /api/revalidate.
    await page.waitForTimeout(2000)
    await page.goto('/id/services')
    await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 })
  })
})
