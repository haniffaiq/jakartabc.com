import { expect, test } from '@playwright/test'

const TEST_EMAIL = process.env.PORTAL_TEST_EMAIL ?? 'test-client@jakartabc.test'
const TEST_PASS = process.env.PORTAL_TEST_PASS ?? 'change-me-test'

test.describe('portal auth', () => {
  test('login → dashboard → logout → login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(TEST_EMAIL)
    await page.locator('input[name="password"]').fill(TEST_PASS)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/welcome/i)).toBeVisible()

    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('invalid credentials show inline error', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill('does-not-exist@jakartabc.test')
    await page.locator('input[name="password"]').fill('nope')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/incorrect/i)).toBeVisible()
  })
})
