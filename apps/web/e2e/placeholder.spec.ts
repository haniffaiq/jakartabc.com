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

test('unknown locale path renders localized not-found', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toContainText("This page isn't here.")
})
