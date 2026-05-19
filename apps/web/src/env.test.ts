import { afterEach, describe, expect, it } from 'vitest'

const ORIGINAL = { ...process.env }
const importEnvCase = (name: string): Promise<typeof import('./env')> =>
  import(`./env?case=${name}`)

function setValidEnv(overrides: Record<string, string | undefined> = {}) {
  process.env.DATABASE_URL = 'postgres://u:***@localhost:5432/db'
  process.env.PAYLOAD_SECRET = 'x'.repeat(32)
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
  process.env.REVALIDATE_SECRET = 'revalidate-secret-value'
  process.env.EMAIL_PROVIDER = 'resend'
  process.env.RESEND_API_KEY = 'resend-key'
  process.env.EMAIL_FROM = 'Jakarta Business Center <hello@jakartabc.com>'
  process.env.SALES_EMAIL = 'sales@jakartabc.com'
  process.env.TURNSTILE_SECRET_KEY = 'turnstile-secret'
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'turnstile-site-key'

  Object.assign(process.env, overrides)
}

afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe('env schema', () => {
  it('rejects short PAYLOAD_SECRET', async () => {
    setValidEnv({ PAYLOAD_SECRET: 'too-short' })

    await expect(importEnvCase('short')).rejects.toThrow(/PAYLOAD_SECRET/)
  })

  it('accepts a valid Resend configuration', async () => {
    setValidEnv()

    const mod = await importEnvCase('ok')

    expect(mod.env.DEFAULT_LOCALE).toBe('en')
    expect(mod.env.EMAIL_PROVIDER).toBe('resend')
    expect(mod.env.RESEND_API_KEY).toBe('resend-key')
    expect(mod.publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBe('turnstile-site-key')
  })

  it('accepts SMTP when SMTP credentials are configured', async () => {
    setValidEnv({
      EMAIL_PROVIDER: 'smtp',
      RESEND_API_KEY: '',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'smtp-user',
      SMTP_PASS: 'smtp-pass',
    })

    const mod = await importEnvCase('smtp')

    expect(mod.env.EMAIL_PROVIDER).toBe('smtp')
    expect(mod.env.SMTP_HOST).toBe('smtp.example.com')
    expect(mod.env.SMTP_PORT).toBe('587')
  })

  it('rejects missing provider-specific credentials', async () => {
    setValidEnv({ RESEND_API_KEY: '' })

    await expect(importEnvCase('missing-email-provider')).rejects.toThrow(
      /Email provider env requirements unmet/,
    )
  })

  it('rejects missing Turnstile keys', async () => {
    setValidEnv({ TURNSTILE_SECRET_KEY: '', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' })

    await expect(importEnvCase('missing-turnstile')).rejects.toThrow(/TURNSTILE/)
  })
})
