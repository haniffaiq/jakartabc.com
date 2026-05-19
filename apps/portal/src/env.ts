import { z } from 'zod'

const Server = z.object({
  DATABASE_URL: z.string().url(),
  PORTAL_PAYLOAD_SECRET: z.string().min(16),
  PORTAL_COOKIE_DOMAIN: z.string().default('app.jakartabc.com'),
})

const Public = z.object({
  NEXT_PUBLIC_PORTAL_URL: z.string().url(),
})

export const env = Server.parse(process.env)
export const publicEnv = Public.parse({
  NEXT_PUBLIC_PORTAL_URL: process.env.NEXT_PUBLIC_PORTAL_URL,
})

export type Env = z.infer<typeof Server>
export type PublicEnv = z.infer<typeof Public>
