import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
)

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true')
const turnstileTestSecrets = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
])
const turnstileTestSiteKeys = new Set([
  '1x00000000000000000000AA',
  '2x00000000000000000000AB',
  '1x00000000000000000000BB',
  '2x00000000000000000000BB',
  '3x00000000000000000000FF',
])

const Server = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),
    REDIS_URL: z.string().url(),
    REDIS_KEY_PREFIX: z.string().trim().min(1, 'REDIS_KEY_PREFIX is required'),
    MINIO_ENDPOINT: z.string().url(),
    MINIO_REGION: z.string().trim().min(1, 'MINIO_REGION is required'),
    MINIO_BUCKET: z.string().trim().min(1, 'MINIO_BUCKET is required'),
    MINIO_ACCESS_KEY: z.string().min(1, 'MINIO_ACCESS_KEY is required'),
    MINIO_SECRET_KEY: z.string().min(1, 'MINIO_SECRET_KEY is required'),
    MINIO_PUBLIC_URL: z.string().url(),
    MINIO_FORCE_PATH_STYLE: booleanString,
    PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 chars'),
    TRUSTED_PROXY_SECRET: z.string().min(32, 'TRUSTED_PROXY_SECRET must be at least 32 chars'),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    DEFAULT_LOCALE: z.enum(['en', 'id']).default('en'),
    REVALIDATE_SECRET: z.string().min(16, 'REVALIDATE_SECRET must be at least 16 chars'),

    EMAIL_PROVIDER: z.enum(['resend', 'smtp']).default('resend'),
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: z.string().min(1, 'EMAIL_FROM is required'),
    SALES_EMAIL: z.string().email(),
    SMTP_HOST: optionalString,
    SMTP_PORT: optionalString,
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    TURNSTILE_SECRET_KEY: z.string().min(8, 'TURNSTILE_SECRET_KEY must be at least 8 chars'),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z
      .string()
      .min(8, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY must be at least 8 chars'),
  })
  .refine(
    (env) =>
      env.EMAIL_PROVIDER === 'resend'
        ? Boolean(env.RESEND_API_KEY)
        : Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
    { message: 'Email provider env requirements unmet', path: ['EMAIL_PROVIDER'] },
  )
  .superRefine((env, context) => {
    if (env.NODE_ENV === 'production' && turnstileTestSecrets.has(env.TURNSTILE_SECRET_KEY)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Turnstile test credential is not allowed in production',
        path: ['TURNSTILE_SECRET_KEY'],
      })
    }
    if (
      env.NODE_ENV === 'production' &&
      turnstileTestSiteKeys.has(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Turnstile test credential is not allowed in production',
        path: ['NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
      })
    }
  })

const Public = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z
    .string()
    .min(8, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY must be at least 8 chars'),
})

function formatEnvErrors(error: z.ZodError) {
  const lines = error.issues.map((issue) => {
    const key = issue.path.join('.') || 'environment'
    return `  - ${key}: ${issue.message}`
  })

  return lines.join('\n')
}

export function parseServerEnv(input: NodeJS.ProcessEnv) {
  const result = Server.safeParse(input)
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${formatEnvErrors(result.error)}`)
  }
  return result.data
}

function parsePublicEnv() {
  const result = Public.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  })
  if (!result.success) {
    throw new Error(`Invalid public environment variables:\n${formatEnvErrors(result.error)}`)
  }
  return result.data
}

export const env = parseServerEnv(process.env)
export const publicEnv = parsePublicEnv()
export type Env = z.infer<typeof Server>
export type PublicEnv = z.infer<typeof Public>
