# Phase 4 — Client Portal Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `app.jakartabc.com` as a separate Next.js app with TLS, a login page backed by the shared Payload `users` collection, and a placeholder authenticated dashboard. Lock the auth strategy in an ADR. Defer doc upload + setup tracking to the full portal spec.

**Architecture:** `apps/portal/` Next.js 15 App Router app on port 3001; mounts its own Payload v3 instance pointing to the SAME postgres database as `apps/web`; Caddy reverse proxies `app.jakartabc.com` → portal container; login uses Payload local auth API (`payload.login`); session cookie scoped to portal subdomain only.

**Tech Stack:** Next.js 15, React 19, Payload v3 (mounted twice — once per app, sharing postgres), next-intl 3 single-locale (EN v1; bilingual deferred), Tailwind via shared preset from `packages/ui`, Vitest, Playwright.

**Prerequisite:** Phase 0 (foundation) is required for shared infra. Phases 1, 2, 3 are not strict prerequisites for portal function but their `packages/ui` and Caddy patterns are reused.

---

## File Structure (created / modified by this phase)

```
jakartabc.com/
├── docs/adr/0001-portal-auth-strategy.md                        [create]
├── apps/portal/
│   ├── package.json                                             [create]
│   ├── tsconfig.json                                            [create]
│   ├── next.config.ts                                           [create]
│   ├── tailwind.config.ts                                       [create]
│   ├── postcss.config.mjs                                       [create]
│   ├── Dockerfile                                               [create]
│   ├── .dockerignore                                            [create]
│   ├── playwright.config.ts                                     [create]
│   ├── src/env.ts                                               [create]
│   ├── src/payload.config.ts                                    [create]
│   ├── src/lib/payload.ts                                       [create]
│   ├── src/lib/auth.ts                                          [create: server actions]
│   ├── src/lib/auth.test.ts                                     [create]
│   ├── src/middleware.ts                                        [create: protect /dashboard]
│   ├── src/middleware.test.ts                                   [create]
│   ├── src/app/layout.tsx                                       [create]
│   ├── src/app/globals.css                                      [create]
│   ├── src/app/page.tsx                                         [create: redirect]
│   ├── src/app/login/page.tsx                                   [create]
│   ├── src/app/dashboard/page.tsx                               [create]
│   ├── src/app/not-found.tsx                                    [create]
│   ├── src/app/error.tsx                                        [create]
│   └── e2e/auth.spec.ts                                         [create]
├── caddy/Caddyfile                                              [modify: add app.jakartabc.com]
├── docker-compose.yml                                           [modify: add portal service]
└── .env.example                                                 [modify: add portal envs]
```

---

## Task Sequence

1. ADR: portal auth strategy
2. `apps/portal` package + Next config + Tailwind preset consumption
3. Portal env schema
4. `payload.config.ts` (admin disabled, shared postgres, no editorial collections)
5. `getPayloadClient()` portal singleton
6. Auth Server Actions: `loginAction`, `logoutAction`, `getCurrentUser`
7. Middleware: protect `/dashboard/*`
8. `app/layout.tsx` chrome
9. `app/page.tsx` redirect logic
10. `app/login/page.tsx`
11. `app/dashboard/page.tsx`
12. not-found.tsx + error.tsx
13. Dockerfile + dockerignore
14. docker-compose service for portal
15. Caddy site `app.jakartabc.com`
16. Env additions (PORTAL_PAYLOAD_SECRET, PORTAL_COOKIE_DOMAIN)
17. CI workflow update (build + test portal)
18. e2e Playwright auth happy path
19. e2e Playwright auth-gate enforcement
20. Deploy runbook update for `app` subdomain
21. Final commit + tag `phase-4-portal-skeleton-complete`

---

## Conventions

- **TDD** as prior phases.
- **Runners:**
  - `pnpm --filter @jakartabc/portal test`
  - `pnpm --filter @jakartabc/portal e2e`
- **Commit footer:** Co-Authored-By per prior phases.
- **Portal cookie name:** `jbc_portal_session` (distinct from web's admin cookie).
- **Portal port:** internal 3001.

---

### Task 1: ADR — Portal auth strategy

**Files:**
- Create: `docs/adr/0001-portal-auth-strategy.md`

- [ ] **Step 1: Write ADR**

```markdown
<!-- docs/adr/0001-portal-auth-strategy.md -->
# ADR 0001 — Portal Auth Strategy

Status: Accepted (2026-05-18)

## Context

Phase 4 stands up `app.jakartabc.com` as a separate Next.js app for clients. Both `apps/web` and `apps/portal` need authenticated user records. Two strategies were considered.

## Options

### Option A — Shared Payload users via portal-mounted Payload (CHOSEN)

Portal mounts its own Payload v3 instance pointing to the SAME postgres database as `apps/web`. Both apps read/write the same `users` collection. Portal admin UI is disabled (only staff log in to the web admin); portal exposes its own login UI via `payload.login` Local API.

**Pros:**
- Single user record per person — same email = same user across apps
- Client invites issued from `apps/web` admin land directly in portal
- Local API is in-process (no HTTP) → fast auth
- Independent scaling: separate container, separate port, separate cookie

**Cons:**
- Schema changes to `users` must coordinate across both apps' Payload configs
- Two Payload runtimes hold open connections to postgres (acceptable; postgres handles it)

### Option B — Separate auth, separate user table (REJECTED)

Portal has its own `portal_users` table + own auth backend.

**Pros:**
- Total isolation; portal can scale independently of web Payload schema

**Cons:**
- Duplicate user identity → invite UX needs two systems
- Doubles security surface (two auth implementations to keep secure)
- Sales/admin can't see portal users without joining tables manually

## Decision

Option A. Migration coordination is handled at schema-change PR time — any `users` field change requires both Payload configs to be updated in the same PR. This is documented in `docs/admin-onboarding.md` for engineering.

## Consequences

- `packages/content` exports `users` collection schema (already there by default from Payload v3); both apps import the same `users` config
- Cookies are scoped to subdomain (`app.jakartabc.com`) and use a distinct name `jbc_portal_session` to avoid collision with web admin's `payload-token` cookie
- A `PORTAL_PAYLOAD_SECRET` env (separate from `PAYLOAD_SECRET`) signs portal sessions, allowing independent rotation

## Out of scope (deferred to full portal spec)

- Role/permission system beyond authenticated/anonymous
- Doc upload + setup tracking UI
- 2FA / SSO
- Email verification on signup (signup happens via admin invite, not self-service v1)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0001-portal-auth-strategy.md
git commit -m "$(cat <<'EOF'
docs(adr): 0001 portal auth strategy — shared Payload users

Option A chosen: portal mounts its own Payload pointing to shared
postgres, distinct cookie name + secret. Schema-coordination cost
documented.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `apps/portal` package scaffold

**Files:**
- Create: `apps/portal/package.json`
- Create: `apps/portal/tsconfig.json`
- Create: `apps/portal/next.config.ts`
- Create: `apps/portal/tailwind.config.ts`
- Create: `apps/portal/postcss.config.mjs`

- [ ] **Step 1: package.json**

```json
{
  "name": "@jakartabc/portal",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "PORT=3001 next dev",
    "build": "next build",
    "start": "PORT=3001 next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "e2e": "playwright test"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "payload": "^3.0.0",
    "@payloadcms/db-postgres": "^3.0.0",
    "@payloadcms/next": "^3.0.0",
    "@payloadcms/richtext-lexical": "^3.0.0",
    "@jakartabc/ui": "workspace:*",
    "@jakartabc/content": "workspace:*",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@jakartabc/config": "workspace:*",
    "@playwright/test": "^1.45.0",
    "@testing-library/react": "^16.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "vitest": "^2.0.0",
    "happy-dom": "^15.0.0",
    "typescript": "^5.5.0"
  }
}
```

```json
// apps/portal/tsconfig.json
{
  "extends": "@jakartabc/config/tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@payload-config": ["./src/payload.config.ts"]
    }
  },
  "include": ["next-env.d.ts", "src/**/*", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// apps/portal/next.config.ts
import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  output: 'standalone',
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'" },
      ],
    }]
  },
}

export default withPayload(nextConfig)
```

```ts
// apps/portal/tailwind.config.ts
import preset from '@jakartabc/ui/tailwind-preset'

export default {
  presets: [preset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
}
```

```js
// apps/portal/postcss.config.mjs
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 2: Install + commit**

```bash
pnpm install
git add apps/portal/package.json apps/portal/tsconfig.json apps/portal/next.config.ts apps/portal/tailwind.config.ts apps/portal/postcss.config.mjs
git commit -m "$(cat <<'EOF'
feat(portal): scaffold apps/portal Next.js 15 + Tailwind preset

Reuses @jakartabc/ui Tailwind preset for visual parity. Listens on port
3001. CSP minimal (no Turnstile required v1).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Portal env schema

**Files:**
- Create: `apps/portal/src/env.ts`
- Modify: `.env.example` (add portal envs)

- [ ] **Step 1: Env schema**

```ts
// apps/portal/src/env.ts
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
export const publicEnv = Public.parse({ NEXT_PUBLIC_PORTAL_URL: process.env.NEXT_PUBLIC_PORTAL_URL })
```

- [ ] **Step 2: Update .env.example**

```env
# .env.example (append)
# --- Portal (apps/portal) ---
PORTAL_PAYLOAD_SECRET=
PORTAL_COOKIE_DOMAIN=app.jakartabc.com
NEXT_PUBLIC_PORTAL_URL=https://app.jakartabc.com
```

- [ ] **Step 3: Commit**

```bash
git add apps/portal/src/env.ts .env.example
git commit -m "$(cat <<'EOF'
chore(portal): env schema w/ separate PAYLOAD secret + cookie domain

PORTAL_PAYLOAD_SECRET separate from web's PAYLOAD_SECRET to allow
independent rotation. Cookie scoped to portal subdomain.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Portal `payload.config.ts`

**Files:**
- Create: `apps/portal/src/payload.config.ts`

- [ ] **Step 1: Implement**

```ts
// apps/portal/src/payload.config.ts
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_PORTAL_URL,
  admin: { disabled: true },  // portal users log into the web admin if they're staff; portal itself has no Payload admin UI
  collections: [
    // Reuse default users collection from Payload. Portal does NOT import editorial collections —
    // it only needs auth. The `users` collection is auto-included by Payload when admin auth is enabled
    // OR we explicitly define a minimal one. We define explicitly to keep schema clear and shared.
    {
      slug: 'users',
      auth: { tokenExpiration: 60 * 60 * 24 * 14, maxLoginAttempts: 5, lockTime: 10 * 60 * 1000, useAPIKey: false },
      admin: { useAsTitle: 'email' },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'role', type: 'select', defaultValue: 'client', options: ['admin', 'editor', 'client'] },
      ],
    },
  ],
  editor: lexicalEditor({}),
  secret: process.env.PORTAL_PAYLOAD_SECRET!,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL } }),
})
```

- [ ] **Step 2: Coordination note**

The `users` collection here MUST stay in sync with the one in `apps/web/src/payload.config.ts`. Phase 4 introduces this; document in admin onboarding that any `users` field change needs both configs updated in the same PR.

Update `apps/web/src/payload.config.ts` to also include the same explicit `users` schema (was implicit before).

- [ ] **Step 3: Commit**

```bash
git add apps/portal/src/payload.config.ts apps/web/src/payload.config.ts
git commit -m "$(cat <<'EOF'
feat(portal): payload.config.ts w/ shared users schema, admin disabled

Portal Payload boots against shared postgres. Admin UI disabled (no
content management here). users collection schema mirrors web's for
coordination.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `getPayloadClient()` portal singleton

**Files:**
- Create: `apps/portal/src/lib/payload.ts`

- [ ] **Step 1: Implement**

```ts
// apps/portal/src/lib/payload.ts
import { getPayload } from 'payload'
import config from '@payload-config'

let cached: Awaited<ReturnType<typeof getPayload>> | null = null
export async function getPayloadClient() {
  if (cached) return cached
  cached = await getPayload({ config })
  return cached
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/portal/src/lib/payload.ts
git commit -m "$(cat <<'EOF'
feat(portal): Payload Local API singleton

Same pattern as web app. In-process; no HTTP hop for auth.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Auth Server Actions + helpers

**Files:**
- Create: `apps/portal/src/lib/auth.ts`
- Create: `apps/portal/src/lib/auth.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/portal/src/lib/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const loginMock = vi.fn()
const cookieStoreSet = vi.fn()
const cookieStoreGet = vi.fn()
const cookieStoreDelete = vi.fn()

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => ({ login: loginMock, auth: vi.fn(async ({ headers }: any) => ({ user: cookieStoreGet('jbc_portal_session') ? { id: 1, email: 'u@x.co' } : null })) })),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: cookieStoreSet, get: cookieStoreGet, delete: cookieStoreDelete })),
  headers: vi.fn(async () => new Headers()),
}))

import { loginAction, logoutAction, getCurrentUser } from './auth'

describe('auth Server Actions', () => {
  beforeEach(() => { loginMock.mockReset(); cookieStoreSet.mockReset(); cookieStoreGet.mockReset(); cookieStoreDelete.mockReset() })

  it('login happy: sets cookie and returns ok', async () => {
    loginMock.mockResolvedValue({ user: { id: 1, email: 'u@x.co' }, token: 'tok' })
    const fd = new FormData(); fd.set('email', 'u@x.co'); fd.set('password', 'pw')
    const res = await loginAction({} as any, fd)
    expect(res.ok).toBe(true)
    expect(cookieStoreSet).toHaveBeenCalledWith(expect.objectContaining({ name: 'jbc_portal_session', value: 'tok', httpOnly: true }))
  })

  it('login invalid: returns ok=false', async () => {
    loginMock.mockRejectedValue(new Error('Invalid credentials'))
    const fd = new FormData(); fd.set('email', 'u@x.co'); fd.set('password', 'wrong')
    const res = await loginAction({} as any, fd)
    expect(res.ok).toBe(false)
  })

  it('login validation: empty email rejects', async () => {
    const fd = new FormData(); fd.set('email', ''); fd.set('password', 'pw')
    const res = await loginAction({} as any, fd)
    expect(res.ok).toBe(false)
  })

  it('logout deletes cookie', async () => {
    await logoutAction()
    expect(cookieStoreDelete).toHaveBeenCalledWith('jbc_portal_session')
  })

  it('getCurrentUser returns null without cookie', async () => {
    cookieStoreGet.mockReturnValue(undefined)
    const user = await getCurrentUser()
    expect(user).toBeNull()
  })
})
```

- [ ] **Step 2: Implement**

```ts
// apps/portal/src/lib/auth.ts
'use server'

import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { getPayloadClient } from '@/lib/payload'

const COOKIE_NAME = 'jbc_portal_session'

export type LoginResult = { ok: true } | { ok: false; error: 'validation' | 'invalid' | 'server' }

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
})

export async function loginAction(_prev: LoginResult | null, formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return { ok: false, error: 'validation' }

  try {
    const payload = await getPayloadClient()
    const res = await payload.login({ collection: 'users', data: parsed.data })
    if (!res.token) return { ok: false, error: 'invalid' }
    const jar = await cookies()
    jar.set({
      name: COOKIE_NAME,
      value: res.token,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: process.env.PORTAL_COOKIE_DOMAIN,
      maxAge: 60 * 60 * 24 * 14,
    })
    return { ok: true }
  } catch (err) {
    if (err instanceof Error && /invalid/i.test(err.message)) return { ok: false, error: 'invalid' }
    console.error('[auth] login error', err)
    return { ok: false, error: 'server' }
  }
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

export async function getCurrentUser() {
  const jar = await cookies()
  const cookie = jar.get(COOKIE_NAME)
  if (!cookie) return null
  try {
    const payload = await getPayloadClient()
    const hdrs = await headers()
    // Forward the cookie via Authorization header for Payload's auth method
    const req = new Headers(hdrs)
    req.set('Cookie', `${COOKIE_NAME}=${cookie.value}`)
    const result = await payload.auth({ headers: req })
    return result.user ?? null
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Test pass + commit**

```bash
pnpm --filter @jakartabc/portal test auth
git add apps/portal/src/lib/auth.ts apps/portal/src/lib/auth.test.ts
git commit -m "$(cat <<'EOF'
feat(portal): loginAction, logoutAction, getCurrentUser

Server Actions: zod validate, payload.login, set HttpOnly + Secure +
SameSite=Lax cookie scoped to PORTAL_COOKIE_DOMAIN. logout deletes
cookie. getCurrentUser verifies via payload.auth.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Middleware — protect `/dashboard/*`

**Files:**
- Create: `apps/portal/src/middleware.ts`
- Create: `apps/portal/src/middleware.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/portal/src/middleware.test.ts
import { describe, it, expect } from 'vitest'
import { middleware } from './middleware'
import { NextRequest } from 'next/server'

function req(path: string, cookie?: string) {
  const headers = new Headers()
  if (cookie) headers.set('cookie', `jbc_portal_session=${cookie}`)
  return new NextRequest(new URL(`https://app.jakartabc.com${path}`), { headers })
}

describe('middleware', () => {
  it('redirects /dashboard → /login when no cookie', () => {
    const res = middleware(req('/dashboard'))
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/login')
  })
  it('lets /dashboard through when cookie present', () => {
    const res = middleware(req('/dashboard', 'tok'))
    expect(res === undefined || res.status === 200).toBe(true)
  })
  it('does not touch /login', () => {
    const res = middleware(req('/login'))
    expect(res === undefined || res.status === 200).toBe(true)
  })
})
```

- [ ] **Step 2: Implement**

```ts
// apps/portal/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'jbc_portal_session'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (path.startsWith('/dashboard')) {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('next', path)
      return NextResponse.redirect(loginUrl)
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
```

- [ ] **Step 3: Test pass + commit**

```bash
pnpm --filter @jakartabc/portal test middleware
git add apps/portal/src/middleware.ts apps/portal/src/middleware.test.ts
git commit -m "$(cat <<'EOF'
feat(portal): middleware protects /dashboard/* without session cookie

Redirects to /login?next=<path>. Cookie value not verified at edge
(Payload auth verifies server-side in getCurrentUser); presence is the
edge gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Portal `app/layout.tsx`

**Files:**
- Create: `apps/portal/src/app/layout.tsx`
- Create: `apps/portal/src/app/globals.css`

- [ ] **Step 1: globals.css**

```css
/* apps/portal/src/app/globals.css */
@import '@jakartabc/ui/tokens';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: layout.tsx**

```tsx
// apps/portal/src/app/layout.tsx
import './globals.css'
import { Fraunces, Inter } from 'next/font/google'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['400','500'] })
const inter    = Inter   ({ subsets: ['latin'], variable: '--font-body',    display: 'swap', weight: ['400','500'] })

export const metadata = { title: 'Client Portal — Jakarta Business Center', description: 'Authenticated portal for Jakarta BC clients.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-bone-50 text-ink-900">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/portal/src/app/layout.tsx apps/portal/src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(portal): root layout w/ shared fonts + tokens

Portal uses Fraunces + Inter same as web. globals.css imports
@jakartabc/ui tokens so palette + spacing are consistent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `app/page.tsx` redirect

**Files:**
- Create: `apps/portal/src/app/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// apps/portal/src/app/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function PortalRoot() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  redirect('/login')
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/portal/src/app/page.tsx
git commit -m "$(cat <<'EOF'
feat(portal): / redirects to /dashboard or /login

Avoids exposing a public landing on the portal subdomain.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `app/login/page.tsx`

**Files:**
- Create: `apps/portal/src/app/login/page.tsx`
- Create: `apps/portal/src/components/LoginFormWired.tsx`

- [ ] **Step 1: Client-side form**

```tsx
// apps/portal/src/components/LoginFormWired.tsx
'use client'
import * as React from 'react'
import { useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input, Eyebrow, DisplayHeading } from '@jakartabc/ui'
import { loginAction, type LoginResult } from '@/lib/auth'

export function LoginFormWired() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') ?? '/dashboard'

  const [state, formAction, isPending] = useActionState<LoginResult | null, FormData>(
    async (_p, fd) => loginAction(_p, fd),
    null,
  )

  React.useEffect(() => {
    if (state?.ok) router.push(next as any)
  }, [state, router, next])

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <Input name="email" type="email" label="Email" required autoComplete="email" autoFocus />
      <Input name="password" type="password" label="Password" required autoComplete="current-password" />
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-danger">
          {state.error === 'invalid' ? 'Email or password is incorrect.' :
           state.error === 'validation' ? 'Please enter a valid email and password.' :
           'Something went wrong. Try again.'}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Page**

```tsx
// apps/portal/src/app/login/page.tsx
import { Eyebrow, DisplayHeading } from '@jakartabc/ui'
import { LoginFormWired } from '@/components/LoginFormWired'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-editorial flex-col justify-center px-6 py-16 md:px-10">
      <Eyebrow>CLIENT PORTAL</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">Sign in to continue.</DisplayHeading>
      <p className="mt-6 max-w-prose text-body-md text-ink-700">
        Authorized client access only. If you don't have an account, contact your Jakarta BC partner.
      </p>
      <div className="mt-12 max-w-prose">
        <Suspense>
          <LoginFormWired />
        </Suspense>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/portal/src/app/login apps/portal/src/components/LoginFormWired.tsx
git commit -m "$(cat <<'EOF'
feat(portal): /login page w/ wired form, redirects on success

Editorial chrome (Eyebrow + DisplayHeading + Input + Button). Server
Action handles auth; on ok the client redirects to ?next=… or
/dashboard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: `app/dashboard/page.tsx`

**Files:**
- Create: `apps/portal/src/app/dashboard/page.tsx`
- Create: `apps/portal/src/components/LogoutButton.tsx`

- [ ] **Step 1: Logout button (Server Action via form)**

```tsx
// apps/portal/src/components/LogoutButton.tsx
'use client'
import { useTransition } from 'react'
import { logoutAction } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Button } from '@jakartabc/ui'

export function LogoutButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() => start(async () => { await logoutAction(); router.push('/login') })}
    >
      Sign out
    </Button>
  )
}
```

- [ ] **Step 2: Dashboard page**

```tsx
// apps/portal/src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { Eyebrow, DisplayHeading } from '@jakartabc/ui'
import { getCurrentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/LogoutButton'

export default async function Dashboard() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <main className="mx-auto max-w-container px-6 py-16 md:px-10">
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>CLIENT PORTAL · DASHBOARD</Eyebrow>
          <DisplayHeading size="lg" className="mt-6">Welcome, {(user as any).name ?? (user as any).email}.</DisplayHeading>
        </div>
        <LogoutButton />
      </div>

      <section className="mt-24 max-w-prose">
        <Eyebrow>Coming soon</Eyebrow>
        <p className="mt-4 text-body-md text-ink-700">
          Document upload and PT PMA setup tracking land in the next portal release. For now, your partner
          will continue to share status updates by email.
        </p>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/portal/src/app/dashboard apps/portal/src/components/LogoutButton.tsx
git commit -m "$(cat <<'EOF'
feat(portal): /dashboard placeholder w/ welcome + Coming Soon block

Reads user via getCurrentUser; redirects to /login if absent.
LogoutButton triggers logoutAction + client-side redirect.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: 404 + 500 pages

**Files:**
- Create: `apps/portal/src/app/not-found.tsx`
- Create: `apps/portal/src/app/error.tsx`

- [ ] **Step 1: Implement**

```tsx
// apps/portal/src/app/not-found.tsx
import Link from 'next/link'
import { Eyebrow, DisplayHeading } from '@jakartabc/ui'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-editorial px-6 py-32 md:px-10 md:py-48">
      <Eyebrow>404</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">This page isn't here.</DisplayHeading>
      <p className="mt-6 max-w-prose text-body-lg text-ink-700">It may have been moved, or the link is incorrect.</p>
      <p className="mt-12"><Link href="/dashboard" className="text-ochre-700 underline underline-offset-4">Back to dashboard</Link></p>
    </main>
  )
}
```

```tsx
// apps/portal/src/app/error.tsx
'use client'
import { Eyebrow, DisplayHeading } from '@jakartabc/ui'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-editorial px-6 py-32 md:px-10 md:py-48">
      <Eyebrow>500</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">Something on our end isn't working.</DisplayHeading>
      <p className="mt-6 max-w-prose text-body-lg text-ink-700">Try again, or contact your partner if it persists.</p>
      <p className="mt-12">
        <button type="button" onClick={reset} className="text-ochre-700 underline underline-offset-4">Try again</button>
      </p>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/portal/src/app/not-found.tsx apps/portal/src/app/error.tsx
git commit -m "$(cat <<'EOF'
feat(portal): editorial 404 + 500 pages

Same quiet typographic treatment as web app. No illustrations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Dockerfile + dockerignore

**Files:**
- Create: `apps/portal/Dockerfile`
- Create: `apps/portal/.dockerignore`

- [ ] **Step 1: Dockerfile**

```dockerfile
# apps/portal/Dockerfile — multi-stage standalone build
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/portal/package.json ./apps/portal/
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app /app
COPY apps/portal ./apps/portal
WORKDIR /app/apps/portal
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=builder /app/apps/portal/.next/standalone ./
COPY --from=builder /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=builder /app/apps/portal/public ./apps/portal/public
EXPOSE 3001
CMD ["node", "apps/portal/server.js"]
```

```text
# apps/portal/.dockerignore
node_modules
.next
.git
e2e
*.test.ts
*.test.tsx
```

- [ ] **Step 2: Commit**

```bash
git add apps/portal/Dockerfile apps/portal/.dockerignore
git commit -m "$(cat <<'EOF'
chore(portal): multi-stage Dockerfile, standalone build, port 3001

Same pattern as apps/web Dockerfile (Phase 0). Slimmed runtime image.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: docker-compose service for portal

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add service**

```yaml
# docker-compose.yml — append
services:
  portal:
    build:
      context: .
      dockerfile: apps/portal/Dockerfile
    env_file: .env
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - PORTAL_PAYLOAD_SECRET=${PORTAL_PAYLOAD_SECRET}
      - PORTAL_COOKIE_DOMAIN=${PORTAL_COOKIE_DOMAIN}
      - NEXT_PUBLIC_PORTAL_URL=${NEXT_PUBLIC_PORTAL_URL}
    expose:
      - "3001"
    depends_on:
      - postgres
    restart: unless-stopped
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "$(cat <<'EOF'
chore(infra): docker-compose portal service on internal :3001

Depends on postgres. Env wired from root .env. Caddy entry routes
app.jakartabc.com to this service (Task 15).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Caddy `app.jakartabc.com`

**Files:**
- Modify: `caddy/Caddyfile`

- [ ] **Step 1: Append site block**

```
# caddy/Caddyfile — append
app.jakartabc.com {
  encode gzip zstd
  reverse_proxy portal:3001
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add caddy/Caddyfile
git commit -m "$(cat <<'EOF'
chore(infra): Caddy site for app.jakartabc.com → portal:3001

Auto TLS via Let's Encrypt. Adds HSTS + X-Content-Type-Options.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Env additions (already done in Task 3 — verify)

Verify `.env.example` includes the portal envs. Skip if Task 3 covered it.

---

### Task 17: CI update — build + test portal

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add portal to build + test matrix**

If existing CI uses `pnpm -w build` and `pnpm -w test`, portal is picked up automatically as a workspace. Otherwise add:

```yaml
# .github/workflows/ci.yml — example shape
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -w lint
      - run: pnpm -w typecheck
      - run: pnpm -w test
      - run: pnpm --filter @jakartabc/portal build
      - run: pnpm --filter @jakartabc/web build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: build apps/portal alongside apps/web on every PR

Workspace-wide lint/typecheck/test already cover portal; explicit build
step asserts production bundle succeeds.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: e2e Playwright — auth happy path

**Files:**
- Create: `apps/portal/playwright.config.ts`
- Create: `apps/portal/e2e/auth.spec.ts`

- [ ] **Step 1: Playwright config**

```ts
// apps/portal/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: process.env.PORTAL_E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm --filter @jakartabc/portal dev',
    url: 'http://localhost:3001/login',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
})
```

- [ ] **Step 2: e2e**

```ts
// apps/portal/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.PORTAL_TEST_EMAIL ?? 'test-client@jakartabc.test'
const TEST_PASS  = process.env.PORTAL_TEST_PASS  ?? 'change-me-test'

test.describe('portal auth', () => {
  test('login → dashboard → logout → login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(TEST_EMAIL)
    await page.locator('input[name="password"]').fill(TEST_PASS)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/welcome/i)).toBeVisible()

    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('invalid credentials show inline error', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill('does-not-exist@jakartabc.test')
    await page.locator('input[name="password"]').fill('nope')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/incorrect/i)).toBeVisible()
  })
})
```

The test requires a seeded test user. Add to a portal seed script (out of scope here — assume staff creates `test-client@jakartabc.test` in web admin before running e2e). Document this requirement in deploy runbook Task 20.

- [ ] **Step 3: Commit**

```bash
git add apps/portal/playwright.config.ts apps/portal/e2e/auth.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): portal auth happy + invalid credentials

Login → dashboard → logout → login round-trip. Invalid creds surface
inline error message.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: e2e auth-gate enforcement

**Files:**
- Modify: `apps/portal/e2e/auth.spec.ts`

- [ ] **Step 1: Append**

```ts
test('unauthenticated /dashboard redirects to /login?next=/dashboard', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard|\/login\?next=\/dashboard/)
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/portal/e2e/auth.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): middleware redirects unauthenticated /dashboard to /login

Asserts ?next param carries the originally requested path.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: Deploy runbook update

**Files:**
- Modify: `README.md` (append portal deploy section)

- [ ] **Step 1: Append section**

```markdown
<!-- README.md — append -->

## Portal deploy (Phase 4)

The client portal runs as a separate container on subdomain `app.jakartabc.com`.

**One-time DNS setup:**

1. Add an `A` record for `app.jakartabc.com` pointing to the VPS IP (same as the main site).
2. Wait for DNS propagation (verify with `dig app.jakartabc.com`).

**First-time portal deploy:**

```bash
ssh deploy@vps
cd /opt/jakartabc.com
git pull
docker compose up -d --build portal
```

Caddy will auto-provision a TLS cert for `app.jakartabc.com` on first request.

**Creating the first portal user:**

The portal has no self-service signup. To create a user, log into the web admin at `https://jakartabc.com/admin` and add a new entry to the `users` collection. Set `role` to `client`. The user will receive password-reset instructions via Payload's auth UI (or share initial credentials securely out-of-band).

**Verifying portal:**

- Visit `https://app.jakartabc.com/login` — login page renders over TLS.
- Sign in with a valid client user — lands on `/dashboard`.
- Logout — returns to `/login`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs(deploy): portal deploy + first-user runbook

DNS A record, container build, first-user creation via web admin.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Final commit + tag `phase-4-portal-skeleton-complete`

- [ ] **Step 1: Full validation**

```bash
pnpm -w lint && pnpm -w typecheck && pnpm -w test
pnpm --filter @jakartabc/portal build
pnpm --filter @jakartabc/portal e2e   # requires test user
```

- [ ] **Step 2: Deploy to staging on `app.staging.jakartabc.com`**

(If staging has a separate subdomain pattern. Same docker-compose; Caddy site block adapts.)

```bash
ssh deploy@staging-vps
cd /opt/jakartabc.com
git pull
docker compose up -d --build portal
```

- [ ] **Step 3: Verify**

- `https://app.jakartabc.com/login` (or staging equivalent) over TLS
- Sign in with a valid client → dashboard renders welcome
- Sign out → back to login

- [ ] **Step 4: Tag + push**

```bash
git tag -a phase-4-portal-skeleton-complete -m "Phase 4: Client portal skeleton — auth + dashboard placeholder live"
git push origin phase-4-portal-skeleton-complete
```

---

## Open questions surfaced during Phase 4

1. **Password reset UX** — Payload's built-in password reset emits a token via email. v1 we rely on the web admin to manage reset; portal users with lost passwords contact their partner. For phase 5 / full portal: add `/forgot-password` and `/reset-password/[token]` routes.
2. **Role-based dashboard content** — `users.role` exists (`admin`/`editor`/`client`). v1 only differentiates "logged in or not". Full portal spec adds role-gated views.
3. **Email verification on signup** — out of scope v1 (no self-service signup).
4. **Audit log of logins** — not stored v1. Consider Payload `versions` on user updates, or a separate `LoginEvents` collection.
5. **Cookie domain in dev** — `app.jakartabc.com` only works in production. For local dev set `PORTAL_COOKIE_DOMAIN=localhost` or leave undefined and run portal at `http://localhost:3001` (cookie scoped to localhost).
6. **2FA** — deferred to full portal spec.
7. **CSP nonce strategy** — portal CSP currently allows `'unsafe-inline'`. Same v1 tolerance as web. Move to nonce-based CSP when both apps move.

---

## Phase 4 → Full portal (separate future spec) handoff notes

What the full portal spec inherits:
- Subdomain + TLS + container deployed
- Shared `users` collection in postgres
- Auth flow proven (login/logout/middleware)
- Editorial chrome reuse via `packages/ui`

What the full portal spec will add (out of scope here):
- Doc upload (S3 / local volume, virus scan)
- PT PMA setup tracking (collection + status views)
- Role-based access control (admin/editor/client)
- Email verification + password reset UX
- Audit log
- Notifications (in-app + email)
- 2FA / SSO (optional)
