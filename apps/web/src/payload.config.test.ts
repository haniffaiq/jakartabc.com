import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }
type PayloadConfigModule = typeof import('./payload.config')
let payloadModule: PayloadConfigModule
let config: Awaited<PayloadConfigModule['default']>

beforeAll(async () => {
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

  payloadModule = await import('./payload.config')
  config = await payloadModule.default
})

afterAll(() => {
  process.env = { ...originalEnv }
})

describe('Payload MinIO storage', () => {
  it('aborts multipart parsing instead of accepting truncated files', async () => {
    expect(config.upload).toMatchObject({ abortOnLimit: true, limits: { fileSize: 5_000_000 } })
  })

  it('disables local media storage through the official S3 adapter', async () => {
    const media = config.collections?.find(({ slug }) => slug === 'media')

    expect(
      media?.upload && typeof media.upload === 'object' && media.upload.disableLocalStorage,
    ).toBe(true)
  })

  it('builds stable encoded public URLs under the media prefix', async () => {
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

    for (const unsafe of ['../media', '..\\media', '%2e%2e%2fmedia', 'media\u0000']) {
      expect(() =>
        (generateMediaFileURL as (args: { filename: string; prefix?: string }) => string)({
          filename: 'logo.webp',
          prefix: unsafe,
        }),
      ).toThrow(/prefix/i)
    }

    for (const unsafe of [
      '../logo.webp',
      '..\\logo.webp',
      '%2e%2e%2flogo.webp',
      'logo\u0000.webp',
    ]) {
      expect(() =>
        (generateMediaFileURL as (args: { filename: string; prefix?: string }) => string)({
          filename: unsafe,
          prefix: 'media',
        }),
      ).toThrow(/filename/i)
    }
  })
})

describe('Payload cache revalidation jobs', () => {
  it('preserves the default jobs collection while restricting CRUD to admins', async () => {
    const override = config.jobs?.jobsCollectionOverrides
    const defaultJobsCollection = {
      slug: 'payload-jobs',
      admin: { group: 'System', hidden: true },
      access: { read: () => true },
      endpoints: [{ handler: vi.fn(), path: '/run', method: 'post' as const }],
      fields: [{ name: 'input', type: 'json' as const }],
      hooks: { beforeChange: [vi.fn()] },
    }

    expect(override).toBeTypeOf('function')
    const overridden = override?.({ defaultJobsCollection })

    expect(overridden?.slug).toBe(defaultJobsCollection.slug)
    expect(overridden?.admin).toBe(defaultJobsCollection.admin)
    expect(overridden?.endpoints).toBe(defaultJobsCollection.endpoints)
    expect(overridden?.fields).toBe(defaultJobsCollection.fields)
    expect(overridden?.hooks).toBe(defaultJobsCollection.hooks)

    const requests = {
      client: { req: { user: { role: 'client' } } },
      editor: { req: { user: { role: 'editor' } } },
      admin: { req: { user: { role: 'admin' } } },
    } as const

    for (const operation of ['create', 'read', 'update', 'delete'] as const) {
      expect(overridden?.access?.[operation]?.(requests.client as never)).toBe(false)
      expect(overridden?.access?.[operation]?.(requests.editor as never)).toBe(false)
      expect(overridden?.access?.[operation]?.(requests.admin as never)).toBe(true)
    }

    // Task 14 regenerates the Payload collection union after the jobs migration.
    const sanitized = config.collections?.find(({ slug }) => String(slug) === 'payload-jobs')
    expect(sanitized).toBeDefined()
    for (const operation of ['create', 'read', 'update', 'delete'] as const) {
      expect(sanitized?.access?.[operation]?.(requests.client as never)).toBe(false)
      expect(sanitized?.access?.[operation]?.(requests.editor as never)).toBe(false)
      expect(sanitized?.access?.[operation]?.(requests.admin as never)).toBe(true)
    }
  })

  it('restricts direct job control to admins', async () => {
    const clientRequest = { req: { user: { role: 'client' } } } as never
    const editorRequest = { req: { user: { role: 'editor' } } } as never
    const adminRequest = { req: { user: { role: 'admin' } } } as never

    expect(config.jobs?.access?.queue?.(clientRequest)).toBe(false)
    expect(config.jobs?.access?.run?.(clientRequest)).toBe(false)
    expect(config.jobs?.access?.cancel?.(clientRequest)).toBe(false)
    expect(config.jobs?.access?.queue?.(editorRequest)).toBe(false)
    expect(config.jobs?.access?.run?.(editorRequest)).toBe(false)
    expect(config.jobs?.access?.cancel?.(editorRequest)).toBe(false)
    expect(config.jobs?.access?.queue?.(adminRequest)).toBe(true)
    expect(config.jobs?.access?.run?.(adminRequest)).toBe(true)
    expect(config.jobs?.access?.cancel?.(adminRequest)).toBe(true)
  })

  it('registers the retrying task with a bounded dedicated autorun queue', async () => {
    const task = config.jobs?.tasks?.find(({ slug }) => slug === 'revalidate-cache')

    expect(task).toMatchObject({
      retries: {
        attempts: 3,
        backoff: { delay: 1_000, type: 'exponential' },
      },
      slug: 'revalidate-cache',
    })
    expect(config.jobs?.autoRun).toEqual([
      {
        cron: '*/10 * * * * *',
        disableScheduling: true,
        limit: 10,
        queue: 'cache-revalidation',
      },
    ])
  })
})
