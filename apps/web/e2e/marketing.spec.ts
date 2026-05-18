import { expect, test } from '@playwright/test'

for (const locale of ['en', 'id'] as const) {
  test(`renders nav and footer chrome @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/' : '/id', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
    await expect(page.getByRole('link', { name: 'jakartabc' }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: locale === 'en' ? 'Services' : 'Layanan' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /hello@jakartabc\.com/i })).toBeVisible()
  })

  test(`home renders editorial list and quote @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/' : '/id', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^01$/ }).first()).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^04$/ }).first()).toBeVisible()
    await expect(page.getByText('Maria Tanaka · Founder, Solstice KK')).toBeVisible()
  })

  test(`insights empty state @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/insights' : '/id/insights', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      locale === 'en'
        ? 'Editorial on Indonesian FDI, with citations.'
        : 'Editorial tentang FDI Indonesia, dengan referensi.',
    )
    await expect(page.getByText(/No articles yet|Belum ada/i)).toBeVisible()
  })

  test(`about renders founder note dark band @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/about' : '/id/about', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(
      page.getByText(locale === 'en' ? 'FROM THE FOUNDER' : 'DARI FOUNDER'),
    ).toBeVisible()
    await expect(page.locator('img[src*="founder-signature"]')).toBeVisible()
  })

  test(`service detail PT PMA renders @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/services/pt-pma-setup' : '/id/services/pt-pma-setup')

    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /PT PMA/i })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: locale === 'en' ? 'On this page' : 'Di halaman ini' }),
    ).toBeVisible()
  })

  test(`contact form fields @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/contact' : '/id/contact')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('textarea[name="message"]')).toBeVisible()
  })

  test(`services overview renders 4 items @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/services' : '/id/services', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      locale === 'en'
        ? 'Foreign direct investment in Indonesia, end to end.'
        : 'Investasi asing langsung di Indonesia, end-to-end.',
    )
    await expect(page.locator('span').filter({ hasText: /^01$/ }).first()).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^04$/ }).first()).toBeVisible()
    await expect(
      page.getByText(locale === 'en' ? 'PT PMA Setup' : 'Pendirian PT PMA'),
    ).toBeVisible()
  })
}
