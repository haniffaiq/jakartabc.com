import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),
  PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 chars'),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  DEFAULT_LOCALE: z.enum(['en', 'id']).default('en'),

  // Reserved for later phases; optional in Phase 0.
  EMAIL_PROVIDER: z.enum(['resend', 'smtp']).optional(),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SALES_EMAIL: z.string().email().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
})

function parseEnv() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors
    const lines = Object.entries(formatted)
      .map(([key, value]) => `  - ${key}: ${(value ?? []).join('; ')}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${lines}`)
  }
  return result.data
}

export const env = parseEnv()
export type Env = z.infer<typeof schema>
