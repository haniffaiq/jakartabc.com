import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@jakartabc.com'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'changeme-test'

async function loginAsEditor(page: Page) {
  await page.goto('/admin')

  const emailInput = page.getByLabel(/email/i)
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(ADMIN_EMAIL)
    await page.getByLabel(/password/i).fill(ADMIN_PASS)
    await page.getByRole('button', { name: /log in/i }).click()
  }

  await expect(page).toHaveURL(/\/admin/)
}

test.describe('CMS editorial flow', () => {
  test('editor updates Service ID name, /id/services reflects after revalidate', async ({
    page,
  }) => {
    await loginAsEditor(page)

    await page.goto('/admin/collections/services')
    await page
      .getByRole('link', { name: /Pendirian PT PMA|PT PMA Setup/ })
      .first()
      .click()
    await page
      .getByRole('button', { name: /id|indonesian/i })
      .first()
      .click()

    const newName = `Pendirian PT PMA · ${Date.now()}`
    await page.getByLabel(/^name$/i).fill(newName)
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText(/successfully/i)).toBeVisible()

    // Public page should reflect after the Services afterChange hook posts to /api/revalidate.
    await page.waitForTimeout(2000)
    await page.goto('/id/services')
    await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 })
  })
})
