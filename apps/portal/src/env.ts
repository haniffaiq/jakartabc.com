import { z } from 'zod'

const Server = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 chars'),
  PORTAL_COOKIE_DOMAIN: z.string().default('app.jakartabc.com'),
  NEXT_PUBLIC_PORTAL_URL: z.string().url(),
})

const Public = z.object({
  NEXT_PUBLIC_PORTAL_URL: z.string().url(),
})

function formatEnvErrors(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const key = issue.path.join('.') || 'environment'
      return `  - ${key}: ${issue.message}`
    })
    .join('\n')
}

export function parseServerEnv(input: NodeJS.ProcessEnv) {
  const result = Server.safeParse(input)
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${formatEnvErrors(result.error)}`)
  }
  return result.data
}

export const env = parseServerEnv(process.env)
export const publicEnv = Public.parse(env)

export type Env = z.infer<typeof Server>
export type PublicEnv = z.infer<typeof Public>
