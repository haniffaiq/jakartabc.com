'use server'

import { cookies, headers } from 'next/headers'
import { createLocalReq, logoutOperation } from 'payload'
import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload'

const COOKIE_NAME = 'jbc_portal_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14

export type LoginResult =
  | { ok: true }
  | { ok: false; error: 'validation' | 'invalid' | 'forbidden' | 'server' }

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
})

function cookieDomain() {
  return process.env.PORTAL_COOKIE_DOMAIN
}

function sessionCookie(value: string, maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    domain: cookieDomain(),
    maxAge,
  }
}

async function revokeSession(payload: Awaited<ReturnType<typeof getPayloadClient>>, token: string) {
  const authHeaders = new Headers()
  authHeaders.set('authorization', `JWT ${token}`)
  authHeaders.set('DisableAutologin', 'true')

  const { user } = await payload.auth({ headers: authHeaders })
  if (!user) throw new Error('Portal session could not be authenticated for revocation')

  const collection = payload.collections.users
  if (!collection) throw new Error('Payload users collection is unavailable')

  const req = await createLocalReq({ req: { headers: authHeaders }, user }, payload)
  await logoutOperation({ collection, req })
}

export async function loginAction(
  _prev: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) return { ok: false, error: 'validation' }

  try {
    const payload = await getPayloadClient()
    const result = await payload.login({ collection: 'users', data: parsed.data })

    if (!result.token) return { ok: false, error: 'invalid' }
    if (result.user?.role !== 'client') {
      await revokeSession(payload, result.token)
      return { ok: false, error: 'forbidden' }
    }

    const jar = await cookies()
    jar.set(sessionCookie(result.token))

    return { ok: true }
  } catch (error) {
    if (error instanceof Error && /invalid|incorrect/i.test(error.message)) {
      return { ok: false, error: 'invalid' }
    }

    console.error('[portal-auth] login failed', error instanceof Error ? error.name : 'unknown')
    return { ok: false, error: 'server' }
  }
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies()
  const cookie = jar.get(COOKIE_NAME)

  try {
    if (cookie) {
      const payload = await getPayloadClient()
      await revokeSession(payload, cookie.value)
    }
  } finally {
    jar.set(sessionCookie('', 0))
  }
}

export async function getCurrentUser() {
  const jar = await cookies()
  const cookie = jar.get(COOKIE_NAME)
  if (!cookie) return null

  try {
    const payload = await getPayloadClient()
    const incomingHeaders = await headers()
    const authHeaders = new Headers(incomingHeaders)
    authHeaders.set('authorization', `JWT ${cookie.value}`)
    authHeaders.set('cookie', `${COOKIE_NAME}=${cookie.value}`)

    const result = await payload.auth({ headers: authHeaders })
    return result.user?.role === 'client' ? result.user : null
  } catch {
    return null
  }
}
