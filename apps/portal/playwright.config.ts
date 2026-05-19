import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: process.env.PORTAL_E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm --filter @jakartabc/portal dev',
    url: 'http://localhost:3001/login',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
})
