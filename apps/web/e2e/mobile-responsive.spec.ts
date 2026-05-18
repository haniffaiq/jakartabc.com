import { devices, expect, test } from '@playwright/test'

const PAGES = [
  '',
  '/services',
  '/services/pt-pma-setup',
  '/pricing',
  '/about',
  '/insights',
  '/contact',
]

test.use({ ...devices['iPhone 14'], browserName: 'chromium' })

for (const locale of ['en', 'id'] as const) {
  for (const path of PAGES) {
    test(`mobile ${locale}${path || '/'} has no horizontal scroll`, async ({ page }) => {
      await page.goto(locale === 'en' ? path || '/' : `/id${path}`, {
        waitUntil: 'domcontentloaded',
      })

      const { clientWidth, scrollWidth } = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
}

test('mobile menu opens and closes', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const menuButton = page.getByRole('button', { name: /open menu/i })
  const menuDialog = page.getByRole('dialog', { name: /menu/i })

  await expect(menuButton).toBeVisible()
  await expect(async () => {
    await menuButton.click()
    await expect(menuDialog).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 10_000 })

  await page.keyboard.press('Escape')
  await expect(menuDialog).toBeHidden()
})
