import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL = { ...process.env }
const importEnvCase = async (_name: string): Promise<typeof import('./env')> => {
  vi.resetModules()
  return import('./env')
}

function setValidEnv(overrides: Record<string, string | undefined> = {}) {
  process.env.DATABASE_URL = 'postgres://u:***@localhost:5432/db'
  process.env.REDIS_URL = 'redis://redis:6379'
  process.env.REDIS_KEY_PREFIX = 'jakartabc:test'
  process.env.MINIO_ENDPOINT = 'http://minio:9000'
  process.env.MINIO_REGION = 'us-east-1'
  process.env.MINIO_BUCKET = 'jakartabc'
  process.env.MINIO_ACCESS_KEY = 'access'
  process.env.MINIO_SECRET_KEY = 'secret'
  process.env.MINIO_PUBLIC_URL = 'https://media.example.test/jakartabc'
  process.env.MINIO_FORCE_PATH_STYLE = 'true'
  process.env.PAYLOAD_SECRET = 'x'.repeat(32)
  process.env.TRUSTED_PROXY_SECRET = 'proxy-secret-value-that-is-at-least-32-characters'
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

  it('parses the shared infrastructure contract with a strict boolean', async () => {
    setValidEnv()
    const mod = await importEnvCase('shared-infrastructure')

    const parsed = mod.parseServerEnv(process.env)

    expect(parsed.REDIS_URL).toBe('redis://redis:6379')
    expect(parsed.REDIS_KEY_PREFIX).toBe('jakartabc:test')
    expect(parsed.MINIO_ENDPOINT).toBe('http://minio:9000')
    expect(parsed.MINIO_REGION).toBe('us-east-1')
    expect(parsed.MINIO_BUCKET).toBe('jakartabc')
    expect(parsed.MINIO_ACCESS_KEY).toBe('access')
    expect(parsed.MINIO_SECRET_KEY).toBe('secret')
    expect(parsed.MINIO_PUBLIC_URL).toBe('https://media.example.test/jakartabc')
    expect(parsed.MINIO_FORCE_PATH_STYLE).toBe(true)
    expect(parsed.TRUSTED_PROXY_SECRET).toHaveLength(49)
  })

  it('rejects non-literal MinIO boolean values', async () => {
    setValidEnv()
    const mod = await importEnvCase('strict-boolean')

    expect(() => mod.parseServerEnv({ ...process.env, MINIO_FORCE_PATH_STYLE: 'TRUE' })).toThrow(
      /MINIO_FORCE_PATH_STYLE/,
    )
  })

  it.each([
    '1x0000000000000000000000000000000AA',
    '2x0000000000000000000000000000000AA',
    '3x0000000000000000000000000000000AA',
  ])('rejects documented Turnstile secret test credential %s in production', async (secretKey) => {
    setValidEnv()
    const mod = await importEnvCase(`production-turnstile-${secretKey}`)

    expect(() =>
      mod.parseServerEnv({
        ...process.env,
        NODE_ENV: 'production',
        TURNSTILE_SECRET_KEY: secretKey,
      }),
    ).toThrow(/test credential/i)
  })

  it.each([
    '1x00000000000000000000AA',
    '2x00000000000000000000AB',
    '1x00000000000000000000BB',
    '2x00000000000000000000BB',
    '3x00000000000000000000FF',
  ])('rejects documented Turnstile site test credential %s in production', async (siteKey) => {
    setValidEnv()
    const mod = await importEnvCase(`production-site-${siteKey}`)

    expect(() =>
      mod.parseServerEnv({
        ...process.env,
        NODE_ENV: 'production',
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: siteKey,
      }),
    ).toThrow(/test credential/i)
  })

  it('accepts a non-test Turnstile credential pair in production', async () => {
    setValidEnv()
    const mod = await importEnvCase('production-turnstile-valid')

    const parsed = mod.parseServerEnv({
      ...process.env,
      NODE_ENV: 'production',
      TURNSTILE_SECRET_KEY: 'production-turnstile-secret',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'production-turnstile-site-key',
    })

    expect(parsed.TURNSTILE_SECRET_KEY).toBe('production-turnstile-secret')
    expect(parsed.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBe('production-turnstile-site-key')
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

  it('accepts missing Turnstile keys and reports the captcha as disabled', async () => {
    setValidEnv({ TURNSTILE_SECRET_KEY: '', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' })

    const mod = await importEnvCase('missing-turnstile')

    expect(mod.env.TURNSTILE_SECRET_KEY).toBeUndefined()
    expect(mod.publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBeUndefined()
  })

  it('still rejects a Turnstile key that is present but too short', async () => {
    setValidEnv({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'short' })

    await expect(importEnvCase('short-turnstile')).rejects.toThrow(
      /NEXT_PUBLIC_TURNSTILE_SITE_KEY/,
    )
  })
})
