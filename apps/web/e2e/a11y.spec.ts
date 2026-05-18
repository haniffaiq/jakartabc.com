import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = [
  '',
  '/services',
  '/services/pt-pma-setup',
  '/pricing',
  '/about',
  '/insights',
  '/contact',
]

for (const locale of ['en', 'id'] as const) {
  for (const path of PAGES) {
    test(`a11y ${locale}${path || '/'} has no WCAG A/AA violations`, async ({ page }) => {
      const url = locale === 'en' ? path || '/' : `/id${path}`

      await page.goto(url)

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()

      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  }
}
