import { expect, test } from '@playwright/test'

const TEST_EMAIL = process.env.PORTAL_TEST_EMAIL ?? 'test-client@jakartabc.test'
const TEST_PASS = process.env.PORTAL_TEST_PASS ?? 'change-me-test'

async function submitLogin(page: import('@playwright/test').Page) {
  await page.locator('input[name="email"]').fill(TEST_EMAIL)
  await page.locator('input[name="password"]').fill(TEST_PASS)
  await page.getByRole('button', { name: /sign in/i }).click()
}

test.describe('portal auth', () => {
  test('login → dashboard → logout → login', async ({ page }) => {
    await page.goto('/login')
    await submitLogin(page)

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

  test('unauthenticated /dashboard redirects to /login?next=/dashboard', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard|\/login\?next=\/dashboard/)
  })

  test('hostile encoded next target falls back to the same-origin dashboard', async ({ page }) => {
    await page.goto('/login?next=%2F%252f%252fevil.test')
    await submitLogin(page)

    await expect(page).toHaveURL(/\/dashboard$/)
    expect(new URL(page.url()).origin).not.toBe('https://evil.test')
  })

  test('valid same-origin next target keeps path, query, and hash', async ({ page }) => {
    await page.goto('/login?next=%2Fdashboard%3Ftab%3Dfiles%23latest')
    await submitLogin(page)

    await expect(page).toHaveURL(/\/dashboard\?tab=files#latest$/)
  })

  test('a forged session cookie does not authorize the dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.context().addCookies([
      {
        name: 'jbc_portal_session',
        value: 'forged-token',
        url: new URL(page.url()).origin,
      },
    ])

    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login$/)
  })
})
