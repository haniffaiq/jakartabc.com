import * as net from 'node:net'

import { expect, test, type Page } from '@playwright/test'
import { getPayload, type Payload } from 'payload'

import { seedServices } from '../../../packages/content/src/seed/services'

const SMTP_PORT = Number(process.env.E2E_SMTP_PORT ?? 2525)
const SALES_EMAIL = process.env.SALES_EMAIL ?? 'sales-e2e@jakartabc.test'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000'

type SmtpMessage = {
  from: string
  to: string[]
  data: string
}

let payload: Payload | null = null
let smtpServer: net.Server | null = null
const smtpMessages: SmtpMessage[] = []

async function ensureBookingFixtures() {
  process.env.DATABASE_URL ??= 'postgres://jakartabc:***@localhost:5432/jakartabc'
  process.env.PAYLOAD_SECRET ??= 'ci-secret-32-chars-minimum-padding-xx'
  process.env.NEXT_PUBLIC_SITE_URL ??= SITE_URL
  process.env.REVALIDATE_SECRET ??= 'ci-revalidate-secret'
  process.env.DEFAULT_LOCALE ??= 'en'
  process.env.SALES_EMAIL ??= SALES_EMAIL
  process.env.EMAIL_FROM ??= 'Jakarta Business Center <hello@jakartabc.test>'
  process.env.EMAIL_PROVIDER ??= 'smtp'
  process.env.SMTP_HOST ??= '127.0.0.1'
  process.env.SMTP_PORT ??= String(SMTP_PORT)
  process.env.SMTP_USER ??= 'e2e'
  process.env.SMTP_PASS ??= 'e2e'
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??= '1x00000000000000000000AA'
  process.env.TURNSTILE_SECRET_KEY ??= '1x0000000000000000000000000000000AA'

  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  await seedServices(payload)
}

async function startSmtpSink() {
  if (smtpServer?.listening) return

  smtpServer = net.createServer((socket) => {
    let from = ''
    let recipients: string[] = []
    let data = ''
    let collectingData = false

    socket.setEncoding('utf8')
    socket.write('220 jakartabc e2e smtp ready\r\n')

    socket.on('data', (chunk) => {
      const lines = String(chunk).split(/\r?\n/)
      for (const line of lines) {
        if (line === '') continue

        if (collectingData) {
          if (line === '.') {
            smtpMessages.push({ from, to: recipients, data })
            data = ''
            collectingData = false
            socket.write('250 queued\r\n')
          } else {
            data += `${line}\n`
          }
          continue
        }

        const upper = line.toUpperCase()
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          socket.write('250-jakartabc e2e smtp\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n')
        } else if (upper.startsWith('AUTH')) {
          socket.write('235 authenticated\r\n')
        } else if (upper.startsWith('MAIL FROM:')) {
          from = line.slice('MAIL FROM:'.length).trim()
          socket.write('250 sender ok\r\n')
        } else if (upper.startsWith('RCPT TO:')) {
          recipients = [...recipients, line.slice('RCPT TO:'.length).trim()]
          socket.write('250 recipient ok\r\n')
        } else if (upper === 'DATA') {
          collectingData = true
          socket.write('354 end data with <CR><LF>.<CR><LF>\r\n')
        } else if (upper === 'RSET') {
          from = ''
          recipients = []
          data = ''
          collectingData = false
          socket.write('250 reset\r\n')
        } else if (upper === 'QUIT') {
          socket.write('221 bye\r\n')
          socket.end()
        } else {
          socket.write('250 ok\r\n')
        }
      }
    })
  })

  await new Promise<void>((resolve, reject) => {
    smtpServer?.once('error', reject)
    smtpServer?.listen(SMTP_PORT, '127.0.0.1', () => {
      smtpServer?.off('error', reject)
      resolve()
    })
  })
}

async function stopSmtpSink() {
  if (!smtpServer) return
  await new Promise<void>((resolve, reject) => {
    smtpServer?.close((error) => (error ? reject(error) : resolve()))
  })
  smtpServer = null
}

async function installTurnstileStub(page: Page) {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.turnstile = {
          render: function (_element, options) {
            window.setTimeout(function () { options.callback('e2e-turnstile-token') }, 0)
            return 'e2e-widget'
          },
          remove: function () {},
          getResponse: function () { return 'e2e-turnstile-token' }
        };
        window.onloadTurnstileCallback && window.onloadTurnstileCallback();
      `,
    })
  })
}

async function fillBookingForm(page: Page, locale: 'en' | 'id', email: string) {
  await page.locator('input[name="name"]').fill(locale === 'en' ? 'E2E Booking Test' : 'Uji Booking E2E')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="company"]').fill('E2E Co')
  await page.locator('input[name="phone"]').fill('+62-21-555-0100')
  await page.locator('select[name="service"]').selectOption('pt-pma-setup')
  await page.locator('input[name="preferredWindows"][value="mon-am"]').check()
  await page
    .locator('textarea[name="message"]')
    .fill('I want to set up a PT PMA. Please contact me with the next practical steps.')
}


async function bookingLeadCount(email: string) {
  if (!payload) throw new Error('Payload fixture is not initialized')

  const result = await payload.find({
    collection: 'booking-leads',
    where: { email: { equals: email } },
    limit: 0,
  })

  return result.totalDocs
}

test.beforeAll(async () => {
  await startSmtpSink()
  await ensureBookingFixtures()
})

test.afterAll(async () => {
  const destroy = (payload as { destroy?: () => Promise<void> } | null)?.destroy
  await destroy?.()
  await stopSmtpSink()
})

for (const locale of ['en', 'id'] as const) {
  test(`booking happy path persists lead and sends email @ ${locale}`, async ({ page }) => {
    const startedAt = smtpMessages.length
    const email = `booking-e2e-${locale}-${Date.now()}@example.test`

    await installTurnstileStub(page)
    await page.goto(locale === 'en' ? '/services/pt-pma-setup' : '/id/services/pt-pma-setup')
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await fillBookingForm(page, locale, email)

    await page.getByRole('button', { name: locale === 'en' ? /send/i : /kirim/i }).click()

    await expect(
      page.getByText(locale === 'en' ? /within 1 business day/i : /dalam 1 hari kerja/i),
    ).toBeVisible({ timeout: 15_000 })

    await expect.poll(() => smtpMessages.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(
      startedAt + 2,
    )

    const lead = await payload?.find({
      collection: 'booking-leads',
      where: { email: { equals: email } },
      limit: 1,
    })

    expect(lead?.docs).toHaveLength(1)
    expect(lead?.docs[0]).toMatchObject({
      name: locale === 'en' ? 'E2E Booking Test' : 'Uji Booking E2E',
      company: 'E2E Co',
      phone: '+62-21-555-0100',
      locale,
      status: 'new',
    })
    expect(smtpMessages.slice(startedAt).some((message) => message.data.includes(email))).toBe(true)
  })
}

test('booking honeypot non-empty silently succeeds without creating a lead', async ({ page }) => {
  const email = `bot+${Date.now()}@example.test`
  const beforeCount = await bookingLeadCount(email)

  await page.goto('/services/pt-pma-setup')
  await page.locator('input[name="hp"]').evaluate((input) => {
    ;(input as HTMLInputElement).value = 'spambot'
  })
  await page.locator('input[name="name"]').fill('Bot')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('select[name="service"]').selectOption('pt-pma-setup')
  await page.locator('textarea[name="message"]').fill('Spammy spammy message text content.')
  await page.getByRole('button', { name: /send/i }).click()

  await expect(page.getByText(/within 1 business day/i)).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => bookingLeadCount(email)).toBe(beforeCount)
})

test('booking rate limit hits at 6th attempt', async ({ page }) => {
  const email = `rate+${Date.now()}@example.test`

  await installTurnstileStub(page)

  for (let i = 0; i < 5; i++) {
    await page.goto('/services/pt-pma-setup')
    await fillBookingForm(page, 'en', email)
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.getByText(/within 1 business day/i)).toBeVisible({ timeout: 15_000 })
  }

  await page.goto('/services/pt-pma-setup')
  await fillBookingForm(page, 'en', email)
  await page.getByRole('button', { name: /send/i }).click()

  await expect(page.getByText(/Couldn’t send|Tidak terkirim/i)).toBeVisible({ timeout: 15_000 })
})
