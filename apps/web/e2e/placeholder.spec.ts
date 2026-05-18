import { expect, test } from '@playwright/test'

test('EN home renders placeholder with lang="en"', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Set up a PT PMA in Indonesia.',
  )
  await expect(page.getByTestId('placeholder-note')).toContainText('Staging environment')
})

test('ID home renders placeholder with lang="id"', async ({ page }) => {
  await page.goto('/id')
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Dirikan PT PMA di Indonesia.',
  )
  await expect(page.getByTestId('placeholder-note')).toContainText('staging')
})

test('EN unknown path renders editorial not-found', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toContainText("This page isn't here.")
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  await expect(page.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/services')
  await expect(page.getByRole('link', { name: 'Insights' })).toHaveAttribute('href', '/insights')
})

test('ID unknown path renders localized editorial not-found', async ({ page }) => {
  const response = await page.goto('/id/this-route-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Halaman ini tidak ada')
  await expect(page.getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/id')
  await expect(page.getByRole('link', { name: 'Layanan' })).toHaveAttribute('href', '/id/services')
  await expect(page.getByRole('link', { name: 'Insight' })).toHaveAttribute('href', '/id/insights')
})


for (const locale of ['en', 'id'] as const) {
  test(`pricing renders transparent fee table @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/pricing' : '/id/pricing')
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      locale === 'en' ? 'Transparent pricing' : 'Harga transparan',
    )
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(5)
    await expect(page.getByText(/IDR/i).first()).toBeVisible()
  })
}
