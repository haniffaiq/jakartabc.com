import { expect, test } from '@playwright/test'

for (const locale of ['en', 'id'] as const) {
  test(`insights empty state @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/insights' : '/id/insights')
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      locale === 'en'
        ? 'Editorial on Indonesian FDI, with citations.'
        : 'Editorial tentang FDI Indonesia, dengan referensi.',
    )
    await expect(page.getByText(/No articles yet|Belum ada/i)).toBeVisible()
  })
}
