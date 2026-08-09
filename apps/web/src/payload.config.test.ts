import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  Object.assign(process.env, {
    DATABASE_URL: 'postgres://user:password@localhost:5432/jakartabc',
    REDIS_URL: 'redis://localhost:6379',
    REDIS_KEY_PREFIX: 'jakartabc:test',
    MINIO_ENDPOINT: 'http://localhost:9000',
    MINIO_REGION: 'us-east-1',
    MINIO_BUCKET: 'jakartabc',
    MINIO_ACCESS_KEY: 'test-access',
    MINIO_SECRET_KEY: 'test-secret',
    MINIO_PUBLIC_URL: 'https://media.example.test/jakartabc',
    MINIO_FORCE_PATH_STYLE: 'true',
    PAYLOAD_SECRET: 'x'.repeat(32),
    TRUSTED_PROXY_SECRET: 'p'.repeat(32),
    NEXT_PUBLIC_SITE_URL: 'https://example.test',
    REVALIDATE_SECRET: 'revalidate-secret-value',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 'resend-key',
    EMAIL_FROM: 'Jakarta BC <hello@example.test>',
    SALES_EMAIL: 'sales@example.test',
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'turnstile-site-key',
  })
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('Payload MinIO storage', () => {
  it('disables local media storage through the official S3 adapter', async () => {
    const payloadModule = await import('./payload.config')
    const config = await payloadModule.default
    const media = config.collections?.find(({ slug }) => slug === 'media')

    expect(
      media?.upload && typeof media.upload === 'object' && media.upload.disableLocalStorage,
    ).toBe(true)
  })

  it('builds stable encoded public URLs under the media prefix', async () => {
    const payloadModule = await import('./payload.config')
    const generateMediaFileURL = (payloadModule as Record<string, unknown>).generateMediaFileURL

    expect(typeof generateMediaFileURL).toBe('function')
    expect(
      (generateMediaFileURL as (args: { filename: string; prefix?: string }) => string)({
        filename: 'brand logo.webp',
        prefix: 'media',
      }),
    ).toBe('https://media.example.test/jakartabc/media/brand%20logo.webp')
    for (const prefix of [undefined, null, '']) {
      expect(
        (generateMediaFileURL as (args: { filename: string; prefix?: null | string }) => string)({
          filename: 'legacy.webp',
          prefix,
        }),
      ).toBe('https://media.example.test/jakartabc/media/legacy.webp')
    }
  })
})
