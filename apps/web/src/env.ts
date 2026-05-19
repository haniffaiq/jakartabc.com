import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
)

const Server = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),
    PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 chars'),
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
  })
  .refine(
    (env) =>
      env.EMAIL_PROVIDER === 'resend'
        ? Boolean(env.RESEND_API_KEY)
        : Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
    { message: 'Email provider env requirements unmet', path: ['EMAIL_PROVIDER'] },
  )

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

function parseEnv() {
  const result = Server.safeParse(process.env)
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

export const env = parseEnv()
export const publicEnv = parsePublicEnv()
export type Env = z.infer<typeof Server>
export type PublicEnv = z.infer<typeof Public>
