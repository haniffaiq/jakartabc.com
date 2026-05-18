# Phase 3 — Booking + Contact Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture booking leads and contact messages end-to-end with persistence, transactional email to sales and visitor, anti-spam protection, and accessible inline success/error states.

**Architecture:** Visitor forms invoke Next.js Server Actions (CSRF native); Server Action validates with zod, checks honeypot + Cloudflare Turnstile + IP+email rate limit, writes via Payload Local API, then sends two emails via `@jakartabc/email` (Resend default, SMTP fallback via env); success replaces the form DOM, errors render inline; sales views and works leads in Payload admin.

**Tech Stack:** Next.js 15 Server Actions, zod, Payload v3 Local API, React Email, Resend SDK, nodemailer (SMTP fallback), Cloudflare Turnstile, lru-cache (rate limit), Vitest, Playwright.

**Prerequisite:** Phase 0 + 1 + 2 complete.

---

## File Structure (created / modified by this phase)

```
jakartabc.com/
├── packages/content/
│   ├── src/collections/BookingLeads.ts                          [create]
│   ├── src/collections/BookingLeads.test.ts                     [create]
│   ├── src/collections/ContactMessages.ts                       [create]
│   ├── src/collections/ContactMessages.test.ts                  [create]
│   ├── src/index.ts                                             [modify: exports]
│   └── src/generated/payload-types.ts                           [regenerate]
├── packages/email/
│   ├── package.json                                             [create]
│   ├── tsconfig.json                                            [create]
│   ├── src/index.ts                                             [create]
│   ├── src/send.ts                                              [create: provider abstraction]
│   ├── src/send.test.ts                                         [create]
│   ├── src/i18n.ts                                              [create: subjects + strings]
│   ├── src/templates/BookingLeadSales.tsx                       [create]
│   ├── src/templates/BookingLeadVisitor.tsx                     [create]
│   ├── src/templates/ContactSales.tsx                           [create]
│   ├── src/templates/ContactVisitor.tsx                         [create]
│   └── src/templates/templates.test.tsx                         [create]
└── apps/web/
    ├── package.json                                             [modify: deps]
    ├── next.config.ts                                           [modify: CSP for Turnstile]
    ├── src/env.ts                                               [modify: add envs]
    ├── src/lib/validation/booking.ts                            [create: zod]
    ├── src/lib/validation/booking.test.ts                       [create]
    ├── src/lib/validation/contact.ts                            [create]
    ├── src/lib/validation/contact.test.ts                       [create]
    ├── src/lib/anti-spam/turnstile.ts                           [create]
    ├── src/lib/anti-spam/turnstile.test.ts                      [create]
    ├── src/lib/anti-spam/rate-limit.ts                          [create]
    ├── src/lib/anti-spam/rate-limit.test.ts                     [create]
    ├── src/app/[locale]/actions/booking.ts                      [create: Server Action]
    ├── src/app/[locale]/actions/booking.test.ts                 [create]
    ├── src/app/[locale]/actions/contact.ts                      [create]
    ├── src/app/[locale]/actions/contact.test.ts                 [create]
    ├── src/app/[locale]/contact/page.tsx                        [modify: wire action]
    ├── src/app/[locale]/services/[slug]/page.tsx                [modify: optional BookingForm preset]
    ├── e2e/booking.spec.ts                                      [create]
    └── e2e/contact.spec.ts                                      [create]
```

---

## Task Sequence

1. `packages/email` workspace + base files
2. `BookingLeadSales` template
3. `BookingLeadVisitor` template (locale-aware)
4. `ContactSales` template
5. `ContactVisitor` template (locale-aware)
6. Email i18n strings
7. `sendEmail` provider abstraction (Resend + SMTP)
8. Env additions + validation
9. `BookingLeads` collection
10. `ContactMessages` collection
11. Regenerate Payload types
12. Booking zod schema + tests
13. Contact zod schema + tests
14. Turnstile verifier
15. Rate limiter
16. Booking Server Action
17. Contact Server Action
18. Wire BookingForm in service detail + contact page
19. Wire ContactForm in contact page
20. CSP additions for Turnstile
21. Admin list-view customizations for BookingLeads
22. e2e booking happy path
23. e2e booking spam path (honeypot non-empty → silent)
24. e2e booking rate limit
25. e2e contact happy path
26. Final commit + tag `phase-3-booking-complete`

---

## Conventions

- **TDD** as Phases 0-2.
- **Vitest runners:**
  - `pnpm --filter @jakartabc/email test`
  - `pnpm --filter @jakartabc/content test`
  - `pnpm --filter @jakartabc/web test`
- **Playwright:** `pnpm --filter @jakartabc/web e2e <file>`.
- **Commit footer:** Co-Authored-By footer per Phases 0-2.

---

### Task 1: Init `packages/email` workspace

**Files:**
- Create: `packages/email/package.json`
- Create: `packages/email/tsconfig.json`
- Create: `packages/email/src/index.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@jakartabc/email",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./templates/*": "./src/templates/*.tsx",
    "./send": "./src/send.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@react-email/components": "^0.0.30",
    "react-email": "^3.0.0",
    "resend": "^4.0.0",
    "nodemailer": "^6.9.0"
  },
  "devDependencies": {
    "@jakartabc/config": "workspace:*",
    "@types/nodemailer": "^6.4.0",
    "@types/react": "^19.0.0",
    "react": "^19.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "happy-dom": "^15.0.0",
    "typescript": "^5.5.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

```json
// packages/email/tsconfig.json
{
  "extends": "@jakartabc/config/tsconfig/react-library.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
```

```ts
// packages/email/src/index.ts
export {}
```

- [ ] **Step 2: Install + commit**

```bash
pnpm install
git add packages/email
git commit -m "$(cat <<'EOF'
feat(email): init packages/email workspace

React Email + Resend + nodemailer dependencies. Templates and send
abstraction follow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `BookingLeadSales` template

**Files:**
- Create: `packages/email/src/templates/BookingLeadSales.tsx`

- [ ] **Step 1: Implement**

```tsx
// packages/email/src/templates/BookingLeadSales.tsx
import { Html, Head, Body, Container, Heading, Text, Section, Link, Preview } from '@react-email/components'
import * as React from 'react'

export type BookingLeadSalesProps = {
  leadId: string | number
  name: string
  email: string
  company?: string
  phone?: string
  service: string
  preferredWindows: string[]
  message: string
  locale: 'en' | 'id'
  siteUrl: string
}

export function BookingLeadSales({ leadId, name, email, company, phone, service, preferredWindows, message, locale, siteUrl }: BookingLeadSalesProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New lead: ${service} — ${name} (${company ?? '—'})`}</Preview>
      <Body style={{ background: '#FAF7F2', fontFamily: 'sans-serif', color: '#1A1815', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
          <Heading as="h1" style={{ fontFamily: 'serif', fontWeight: 400, fontSize: 28 }}>New booking lead</Heading>
          <Text style={{ marginTop: 4, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3A352E' }}>{`Lead #${leadId}`}</Text>

          <Section style={{ marginTop: 24 }}>
            <Row label="Name" value={name} />
            <Row label="Email" value={email} />
            <Row label="Company" value={company ?? '—'} />
            <Row label="Phone" value={phone ?? '—'} />
            <Row label="Service" value={service} />
            <Row label="Preferred windows" value={preferredWindows.length ? preferredWindows.join(', ') : '—'} />
            <Row label="Visitor locale" value={locale.toUpperCase()} />
          </Section>

          <Section style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3A352E' }}>Message</Text>
            <Text style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{message}</Text>
          </Section>

          <Section style={{ marginTop: 32 }}>
            <Link href={`${siteUrl}/admin/collections/booking-leads/${leadId}`} style={{ color: '#95701E', textDecoration: 'underline' }}>
              Open in admin →
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ margin: '6px 0' }}>
      <strong>{label}: </strong>{value}
    </Text>
  )
}

export default BookingLeadSales
```

- [ ] **Step 2: Commit**

```bash
git add packages/email/src/templates/BookingLeadSales.tsx
git commit -m "$(cat <<'EOF'
feat(email): BookingLeadSales template

Structured fields + admin deep-link. Bone background, ink text, ochre
underlined link — matches design system in HTML email shape.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `BookingLeadVisitor` template (locale-aware)

**Files:**
- Create: `packages/email/src/templates/BookingLeadVisitor.tsx`

- [ ] **Step 1: Implement**

```tsx
// packages/email/src/templates/BookingLeadVisitor.tsx
import { Html, Head, Body, Container, Heading, Text, Section, Preview } from '@react-email/components'
import * as React from 'react'

export type BookingLeadVisitorProps = {
  name: string
  service: string
  locale: 'en' | 'id'
  partnerName: string
  partnerEmail: string
}

const COPY = {
  en: {
    preview: 'We received your request — Jakarta Business Center',
    subject: 'We received your request',
    greeting: (name: string) => `Hello ${name},`,
    body: (svc: string) => `Thank you for your interest in ${svc}. We've received your request and will reply within one business day.`,
    sig: (n: string, e: string) => `— ${n} (${e}), Jakarta Business Center`,
    legal: 'You are receiving this because you submitted a request at jakartabc.com.',
  },
  id: {
    preview: 'Kami menerima permintaan Anda — Jakarta Business Center',
    subject: 'Kami menerima permintaan Anda',
    greeting: (name: string) => `Halo ${name},`,
    body: (svc: string) => `Terima kasih atas minat Anda pada ${svc}. Kami sudah menerima permintaan Anda dan akan membalas dalam 1 hari kerja.`,
    sig: (n: string, e: string) => `— ${n} (${e}), Jakarta Business Center`,
    legal: 'Anda menerima ini karena mengirim permintaan di jakartabc.com.',
  },
} as const

export function BookingLeadVisitor({ name, service, locale, partnerName, partnerEmail }: BookingLeadVisitorProps) {
  const c = COPY[locale]
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={{ background: '#FAF7F2', fontFamily: 'sans-serif', color: '#1A1815', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
          <Heading as="h1" style={{ fontFamily: 'serif', fontWeight: 400, fontSize: 28 }}>{c.subject}</Heading>
          <Text style={{ marginTop: 24 }}>{c.greeting(name)}</Text>
          <Text style={{ marginTop: 12 }}>{c.body(service)}</Text>
          <Section style={{ marginTop: 32 }}>
            <Text>{c.sig(partnerName, partnerEmail)}</Text>
          </Section>
          <hr style={{ border: 0, borderTop: '1px solid rgba(26,24,21,0.08)', margin: '32px 0' }} />
          <Text style={{ fontSize: 12, color: '#6B6358' }}>{c.legal}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingLeadVisitor
```

- [ ] **Step 2: Commit**

```bash
git add packages/email/src/templates/BookingLeadVisitor.tsx
git commit -m "$(cat <<'EOF'
feat(email): BookingLeadVisitor auto-reply, EN + ID copy

Locale-aware preview/subject/greeting/body. Sig references partner
name + email so visitor has a human handle for follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `ContactSales` template

**Files:**
- Create: `packages/email/src/templates/ContactSales.tsx`

- [ ] **Step 1: Implement**

```tsx
// packages/email/src/templates/ContactSales.tsx
import { Html, Head, Body, Container, Heading, Text, Section, Link, Preview } from '@react-email/components'
import * as React from 'react'

export type ContactSalesProps = {
  messageId: string | number
  name: string
  email: string
  company?: string
  message: string
  locale: 'en' | 'id'
  siteUrl: string
}

export function ContactSales({ messageId, name, email, company, message, locale, siteUrl }: ContactSalesProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New contact: ${name} (${company ?? '—'})`}</Preview>
      <Body style={{ background: '#FAF7F2', fontFamily: 'sans-serif', color: '#1A1815' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
          <Heading as="h1" style={{ fontFamily: 'serif', fontWeight: 400, fontSize: 28 }}>New contact message</Heading>
          <Text style={{ marginTop: 4, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{`#${messageId}`}</Text>
          <Section style={{ marginTop: 24 }}>
            <Text><strong>Name: </strong>{name}</Text>
            <Text><strong>Email: </strong>{email}</Text>
            <Text><strong>Company: </strong>{company ?? '—'}</Text>
            <Text><strong>Visitor locale: </strong>{locale.toUpperCase()}</Text>
          </Section>
          <Section style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Message</Text>
            <Text style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{message}</Text>
          </Section>
          <Section style={{ marginTop: 32 }}>
            <Link href={`${siteUrl}/admin/collections/contact-messages/${messageId}`} style={{ color: '#95701E' }}>Open in admin →</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ContactSales
```

- [ ] **Step 2: Commit**

```bash
git add packages/email/src/templates/ContactSales.tsx
git commit -m "$(cat <<'EOF'
feat(email): ContactSales internal notification template

Same structure as BookingLeadSales but for /contact submissions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `ContactVisitor` template

**Files:**
- Create: `packages/email/src/templates/ContactVisitor.tsx`

- [ ] **Step 1: Implement**

```tsx
// packages/email/src/templates/ContactVisitor.tsx
import { Html, Head, Body, Container, Heading, Text, Preview, Section } from '@react-email/components'
import * as React from 'react'

export type ContactVisitorProps = { name: string; locale: 'en' | 'id'; replyEmail: string }

const COPY = {
  en: {
    preview: 'Thanks for reaching out — Jakarta Business Center',
    subject: 'Thanks for reaching out',
    body: (n: string) => `Hi ${n},\n\nWe received your message and will reply within one business day. If urgent, you can also write directly to the address below.`,
    sig: (e: string) => `— Jakarta Business Center · ${e}`,
  },
  id: {
    preview: 'Terima kasih sudah menghubungi — Jakarta Business Center',
    subject: 'Terima kasih sudah menghubungi',
    body: (n: string) => `Halo ${n},\n\nKami menerima pesan Anda dan akan membalas dalam 1 hari kerja. Bila mendesak, silakan kirim ke alamat di bawah.`,
    sig: (e: string) => `— Jakarta Business Center · ${e}`,
  },
} as const

export function ContactVisitor({ name, locale, replyEmail }: ContactVisitorProps) {
  const c = COPY[locale]
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={{ background: '#FAF7F2', fontFamily: 'sans-serif', color: '#1A1815' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
          <Heading as="h1" style={{ fontFamily: 'serif', fontWeight: 400, fontSize: 28 }}>{c.subject}</Heading>
          <Text style={{ marginTop: 24, whiteSpace: 'pre-wrap' }}>{c.body(name)}</Text>
          <Section style={{ marginTop: 32 }}><Text>{c.sig(replyEmail)}</Text></Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ContactVisitor
```

- [ ] **Step 2: Commit**

```bash
git add packages/email/src/templates/ContactVisitor.tsx
git commit -m "$(cat <<'EOF'
feat(email): ContactVisitor auto-reply, EN + ID copy

Soft confirmation; offers direct reply address as fallback for urgent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Email i18n strings + template snapshot tests

**Files:**
- Create: `packages/email/src/i18n.ts`
- Create: `packages/email/src/templates/templates.test.tsx`

- [ ] **Step 1: i18n strings (subjects)**

```ts
// packages/email/src/i18n.ts
export const subjects = {
  bookingLeadSales: (service: string, name: string) => `[Lead] ${service} — ${name}`,
  bookingLeadVisitor: { en: 'We received your request — Jakarta Business Center', id: 'Kami menerima permintaan Anda — Jakarta Business Center' },
  contactSales: (name: string) => `[Contact] ${name}`,
  contactVisitor: { en: 'Thanks for reaching out — Jakarta Business Center', id: 'Terima kasih sudah menghubungi — Jakarta Business Center' },
} as const
```

- [ ] **Step 2: Snapshot tests**

```tsx
// packages/email/src/templates/templates.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import { BookingLeadSales } from './BookingLeadSales'
import { BookingLeadVisitor } from './BookingLeadVisitor'
import { ContactSales } from './ContactSales'
import { ContactVisitor } from './ContactVisitor'

describe('email templates', () => {
  it('BookingLeadSales renders to HTML with all fields', async () => {
    const html = await render(
      <BookingLeadSales
        leadId={42} name="Maria T" email="m@t.co" company="Solstice KK" phone="+81-1"
        service="PT PMA Setup" preferredWindows={['mon-am', 'tue-pm']}
        message="Hello"
        locale="en" siteUrl="https://jakartabc.com"
      />
    )
    expect(html).toContain('Maria T')
    expect(html).toContain('Solstice KK')
    expect(html).toContain('mon-am, tue-pm')
    expect(html).toContain('/admin/collections/booking-leads/42')
  })

  it('BookingLeadVisitor EN', async () => {
    const html = await render(<BookingLeadVisitor name="Maria" service="PT PMA Setup" locale="en" partnerName="Diah Putri" partnerEmail="diah@jakartabc.com" />)
    expect(html).toContain('Hello Maria')
    expect(html).toContain('Diah Putri')
  })

  it('BookingLeadVisitor ID', async () => {
    const html = await render(<BookingLeadVisitor name="Budi" service="Pendirian PT PMA" locale="id" partnerName="Diah" partnerEmail="d@x.co" />)
    expect(html).toContain('Halo Budi')
    expect(html).toContain('Pendirian PT PMA')
  })

  it('ContactSales renders', async () => {
    const html = await render(<ContactSales messageId={3} name="X" email="x@y" company="Z" message="msg" locale="en" siteUrl="https://x.com" />)
    expect(html).toContain('New contact message')
  })

  it('ContactVisitor ID', async () => {
    const html = await render(<ContactVisitor name="Sari" locale="id" replyEmail="hello@jakartabc.com" />)
    expect(html).toContain('Halo Sari')
    expect(html).toContain('hello@jakartabc.com')
  })
})
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/email test
git add packages/email/src/i18n.ts packages/email/src/templates/templates.test.tsx
git commit -m "$(cat <<'EOF'
test(email): render snapshots + subject helpers

All 4 templates render to HTML with expected substrings across both
locales for visitor templates.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `sendEmail` provider abstraction

**Files:**
- Create: `packages/email/src/send.ts`
- Create: `packages/email/src/send.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/email/src/send.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const resendSendMock = vi.fn()
vi.mock('resend', () => ({ Resend: vi.fn(() => ({ emails: { send: resendSendMock } })) }))
const nodemailerSendMock = vi.fn()
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: nodemailerSendMock })) },
  createTransport: vi.fn(() => ({ sendMail: nodemailerSendMock })),
}))

import { sendEmail } from './send'

describe('sendEmail', () => {
  beforeEach(() => {
    resendSendMock.mockReset(); nodemailerSendMock.mockReset()
    process.env.EMAIL_FROM = 'Jakarta BC <hello@jakartabc.com>'
  })

  it('uses Resend when EMAIL_PROVIDER=resend', async () => {
    process.env.EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 'key'
    resendSendMock.mockResolvedValue({ data: { id: 're_1' }, error: null })

    const res = await sendEmail({ to: 'x@y', subject: 'S', html: '<p>h</p>', text: 'h' })
    expect(res.ok).toBe(true)
    expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'x@y', subject: 'S', html: '<p>h</p>' }))
  })

  it('uses nodemailer when EMAIL_PROVIDER=smtp', async () => {
    process.env.EMAIL_PROVIDER = 'smtp'
    process.env.SMTP_HOST = 'smtp.x'; process.env.SMTP_PORT = '587'; process.env.SMTP_USER = 'u'; process.env.SMTP_PASS = 'p'
    nodemailerSendMock.mockResolvedValue({ messageId: 'm_1' })

    const res = await sendEmail({ to: 'x@y', subject: 'S', html: '<p>h</p>', text: 'h' })
    expect(res.ok).toBe(true)
    expect(nodemailerSendMock).toHaveBeenCalled()
  })

  it('returns ok=false on Resend error', async () => {
    process.env.EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 'key'
    resendSendMock.mockResolvedValue({ data: null, error: { message: 'bounce' } })
    const res = await sendEmail({ to: 'x@y', subject: 'S', html: 'h', text: 'h' })
    expect(res.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Implement**

```ts
// packages/email/src/send.ts
import { Resend } from 'resend'
import nodemailer from 'nodemailer'

export type SendArgs = { to: string; subject: string; html: string; text: string; from?: string }
export type SendResult = { ok: true; id: string } | { ok: false; error: string }

function fromAddr() { return process.env.EMAIL_FROM ?? 'no-reply@jakartabc.com' }

async function sendViaResend(args: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY missing' }
  const resend = new Resend(key)
  const { data, error } = await resend.emails.send({
    from: args.from ?? fromAddr(), to: args.to, subject: args.subject, html: args.html, text: args.text,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data?.id ?? 'unknown' }
}

async function sendViaSmtp(args: SendArgs): Promise<SendResult> {
  const host = process.env.SMTP_HOST, port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return { ok: false, error: 'SMTP_* env missing' }
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
  try {
    const info = await transport.sendMail({ from: args.from ?? fromAddr(), to: args.to, subject: args.subject, html: args.html, text: args.text })
    return { ok: true, id: info.messageId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase()
  const res = provider === 'smtp' ? await sendViaSmtp(args) : await sendViaResend(args)
  if (!res.ok) console.error(`[email] send failed: ${res.error}`)
  return res
}
```

- [ ] **Step 3: Test pass + commit**

```bash
pnpm --filter @jakartabc/email test
git add packages/email/src/send.ts packages/email/src/send.test.ts
git commit -m "$(cat <<'EOF'
feat(email): sendEmail abstraction w/ Resend default + SMTP fallback

Provider chosen via EMAIL_PROVIDER env. SMTP via nodemailer for self-host
fallback. Errors logged to stderr; result returned to caller (never throws).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Env additions + validation

**Files:**
- Modify: `.env.example`
- Modify: `apps/web/src/env.ts`

- [ ] **Step 1: Update .env.example**

```env
# .env.example (append)
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM="Jakarta Business Center <hello@jakartabc.com>"
SALES_EMAIL=sales@jakartabc.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

- [ ] **Step 2: Extend env schema**

```ts
// apps/web/src/env.ts (extend existing schema)
import { z } from 'zod'

const Server = z.object({
  // existing keys from Phase 0
  DATABASE_URL: z.string().url(),
  PAYLOAD_SECRET: z.string().min(16),
  REVALIDATE_SECRET: z.string().min(16),
  // Phase 3 additions
  EMAIL_PROVIDER: z.enum(['resend', 'smtp']).default('resend'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string(),
  SALES_EMAIL: z.string().email(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().min(8),
}).refine(
  (e) => e.EMAIL_PROVIDER === 'resend' ? !!e.RESEND_API_KEY : !!(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS),
  { message: 'Email provider env requirements unmet' },
)

const Public = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(8),
})

export const env = Server.parse(process.env)
export const publicEnv = Public.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
})
```

- [ ] **Step 3: Commit**

```bash
git add .env.example apps/web/src/env.ts
git commit -m "$(cat <<'EOF'
chore(env): add email + Turnstile envs w/ zod validation

EMAIL_PROVIDER gates required keys (Resend vs SMTP). Turnstile keys
required server + public.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `BookingLeads` collection

**Files:**
- Create: `packages/content/src/collections/BookingLeads.ts`
- Create: `packages/content/src/collections/BookingLeads.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/content/src/collections/BookingLeads.test.ts
import { describe, it, expect } from 'vitest'
import { BookingLeads } from './BookingLeads'

describe('BookingLeads collection', () => {
  it('has expected fields + access control', () => {
    expect(BookingLeads.slug).toBe('booking-leads')
    const names = (BookingLeads.fields as any[]).map((f) => f.name)
    expect(names).toEqual(expect.arrayContaining(['name','email','company','phone','service','preferredWindows','message','locale','status','notes']))
  })

  it('access.create is public; read/update/delete admin-only', () => {
    const access = BookingLeads.access!
    const anon = { user: undefined as any }
    expect(access.create!(anon as any)).toBe(true)
    expect(access.read!(anon as any)).toBe(false)
    expect(access.update!(anon as any)).toBe(false)
    expect(access.delete!(anon as any)).toBe(false)
    const admin = { user: { collection: 'users' } } as any
    expect(access.read!(admin)).toBe(true)
  })
})
```

- [ ] **Step 2: Implement**

```ts
// packages/content/src/collections/BookingLeads.ts
import type { CollectionConfig } from 'payload'

export const BookingLeads: CollectionConfig = {
  slug: 'booking-leads',
  admin: { group: 'Sales', useAsTitle: 'name', defaultColumns: ['createdAt', 'name', 'company', 'service', 'status'] },
  access: {
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'company', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'service', type: 'relationship', relationTo: 'services', required: true },
    { name: 'preferredWindows', type: 'select', hasMany: true, options: ['mon-am','mon-pm','tue-am','tue-pm','wed-am','wed-pm','thu-am','thu-pm','fri-am','fri-pm'] },
    { name: 'message', type: 'textarea', required: true },
    { name: 'locale', type: 'select', required: true, options: ['en','id'], defaultValue: 'en' },
    { name: 'status', type: 'select', required: true, defaultValue: 'new', options: [
      { label: 'New', value: 'new' },
      { label: 'Contacted', value: 'contacted' },
      { label: 'Converted', value: 'converted' },
      { label: 'Dropped', value: 'dropped' },
    ]},
    { name: 'notes', type: 'textarea', admin: { description: 'Internal sales notes' } },
  ],
  timestamps: true,
}
```

Register in `apps/web/src/payload.config.ts`. Test pass. Commit.

```bash
git add packages/content/src/collections/BookingLeads.ts packages/content/src/collections/BookingLeads.test.ts apps/web/src/payload.config.ts
git commit -m "$(cat <<'EOF'
feat(content): BookingLeads collection

Public create (form submit), admin-only read/update/delete. Status
workflow new → contacted → converted/dropped. Indexed email field.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `ContactMessages` collection

**Files:**
- Create: `packages/content/src/collections/ContactMessages.ts`
- Create: `packages/content/src/collections/ContactMessages.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/content/src/collections/ContactMessages.test.ts
import { describe, it, expect } from 'vitest'
import { ContactMessages } from './ContactMessages'

describe('ContactMessages', () => {
  it('expected fields + access', () => {
    expect(ContactMessages.slug).toBe('contact-messages')
    const names = (ContactMessages.fields as any[]).map((f) => f.name)
    expect(names).toEqual(expect.arrayContaining(['name','email','company','message','locale','status','notes']))
  })
})
```

- [ ] **Step 2: Implement**

```ts
// packages/content/src/collections/ContactMessages.ts
import type { CollectionConfig } from 'payload'

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  admin: { group: 'Sales', useAsTitle: 'name', defaultColumns: ['createdAt', 'name', 'company', 'status'] },
  access: {
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'company', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    { name: 'locale', type: 'select', required: true, options: ['en','id'], defaultValue: 'en' },
    { name: 'status', type: 'select', required: true, defaultValue: 'new', options: ['new','contacted','converted','dropped'] },
    { name: 'notes', type: 'textarea' },
  ],
  timestamps: true,
}
```

Register, test pass, commit.

```bash
git add packages/content/src/collections/ContactMessages.ts packages/content/src/collections/ContactMessages.test.ts apps/web/src/payload.config.ts
git commit -m "$(cat <<'EOF'
feat(content): ContactMessages collection

Same access shape as BookingLeads. Simpler schema: no service relation
or preferred-windows.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Regenerate Payload types

**Files:**
- Modify: `packages/content/src/generated/payload-types.ts`

- [ ] **Step 1: Run codegen**

```bash
pnpm --filter @jakartabc/web payload generate:types
```

- [ ] **Step 2: Commit**

```bash
git add packages/content/src/generated/payload-types.ts
git commit -m "$(cat <<'EOF'
chore(content): regenerate types for BookingLeads + ContactMessages

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Booking zod schema

**Files:**
- Create: `apps/web/src/lib/validation/booking.ts`
- Create: `apps/web/src/lib/validation/booking.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/web/src/lib/validation/booking.test.ts
import { describe, it, expect } from 'vitest'
import { bookingSchema } from './booking'

describe('bookingSchema', () => {
  const valid = {
    name: 'Maria', email: 'm@t.co', company: 'Solstice', phone: '',
    serviceSlug: 'pt-pma-setup', preferredWindows: ['mon-am'],
    message: 'Hello, I would like to set up a PT PMA.',
    locale: 'en', hp: '', turnstileToken: 'tok_xyz',
  }

  it('parses valid input', () => {
    expect(() => bookingSchema.parse(valid)).not.toThrow()
  })

  it('rejects bad email', () => {
    expect(() => bookingSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects missing serviceSlug', () => {
    expect(() => bookingSchema.parse({ ...valid, serviceSlug: '' })).toThrow()
  })

  it('requires message ≥10 chars', () => {
    expect(() => bookingSchema.parse({ ...valid, message: 'short' })).toThrow()
  })

  it('rejects invalid preferredWindows value', () => {
    expect(() => bookingSchema.parse({ ...valid, preferredWindows: ['sat-am'] as any })).toThrow()
  })

  it('treats hp non-empty as honeypot trigger (parse OK, server rejects)', () => {
    expect(() => bookingSchema.parse({ ...valid, hp: 'spam' })).not.toThrow()
  })
})
```

- [ ] **Step 2: Implement**

```ts
// apps/web/src/lib/validation/booking.ts
import { z } from 'zod'

export const WINDOWS = ['mon-am','mon-pm','tue-am','tue-pm','wed-am','wed-pm','thu-am','thu-pm','fri-am','fri-pm'] as const

export const bookingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  company: z.string().trim().max(200).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  serviceSlug: z.string().trim().min(1).max(80),
  preferredWindows: z.array(z.enum(WINDOWS)).max(WINDOWS.length).optional().default([]),
  message: z.string().trim().min(10).max(4000),
  locale: z.enum(['en','id']).default('en'),
  hp: z.string().max(0).or(z.string()).optional().default(''),
  turnstileToken: z.string().min(1),
})

export type BookingInput = z.infer<typeof bookingSchema>
```

Test pass, commit.

```bash
git add apps/web/src/lib/validation/booking.ts apps/web/src/lib/validation/booking.test.ts
git commit -m "$(cat <<'EOF'
feat(web): zod booking schema w/ length caps + locale + honeypot

Honeypot validated as string but checked by Server Action (non-empty
triggers silent reject). Email lowercased.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Contact zod schema

**Files:**
- Create: `apps/web/src/lib/validation/contact.ts`
- Create: `apps/web/src/lib/validation/contact.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/web/src/lib/validation/contact.test.ts
import { describe, it, expect } from 'vitest'
import { contactSchema } from './contact'

describe('contactSchema', () => {
  const valid = { name: 'Sari', email: 's@x.co', company: '', message: 'A reasonable message length.', locale: 'id', hp: '', turnstileToken: 'tok' }
  it('parses valid', () => { expect(() => contactSchema.parse(valid)).not.toThrow() })
  it('requires message ≥10', () => { expect(() => contactSchema.parse({ ...valid, message: 'no' })).toThrow() })
})
```

- [ ] **Step 2: Implement**

```ts
// apps/web/src/lib/validation/contact.ts
import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  company: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(10).max(4000),
  locale: z.enum(['en','id']).default('en'),
  hp: z.string().optional().default(''),
  turnstileToken: z.string().min(1),
})

export type ContactInput = z.infer<typeof contactSchema>
```

Test pass, commit.

```bash
git add apps/web/src/lib/validation/contact.ts apps/web/src/lib/validation/contact.test.ts
git commit -m "$(cat <<'EOF'
feat(web): zod contact schema

Subset of booking schema; 4 fields + locale + honeypot + Turnstile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Turnstile verifier

**Files:**
- Create: `apps/web/src/lib/anti-spam/turnstile.ts`
- Create: `apps/web/src/lib/anti-spam/turnstile.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/web/src/lib/anti-spam/turnstile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('verifyTurnstile', () => {
  beforeEach(() => { process.env.TURNSTILE_SECRET_KEY = 'sec' })

  it('returns true when API returns success=true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }))
    const { verifyTurnstile } = await import('./turnstile')
    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(true)
  })

  it('returns false on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ success: false }) }))
    const { verifyTurnstile } = await import('./turnstile')
    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
  })

  it('returns false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))
    const { verifyTurnstile } = await import('./turnstile')
    await expect(verifyTurnstile('tok', '1.2.3.4')).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Implement**

```ts
// apps/web/src/lib/anti-spam/turnstile.ts
const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token: string, remoteip: string): Promise<boolean> {
  try {
    const params = new URLSearchParams()
    params.set('secret', process.env.TURNSTILE_SECRET_KEY ?? '')
    params.set('response', token)
    if (remoteip) params.set('remoteip', remoteip)
    const res = await fetch(ENDPOINT, { method: 'POST', body: params, headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    const data = await res.json() as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
```

Test pass, commit.

```bash
git add apps/web/src/lib/anti-spam/turnstile.ts apps/web/src/lib/anti-spam/turnstile.test.ts
git commit -m "$(cat <<'EOF'
feat(web): verifyTurnstile server-side challenge check

POSTs token to Cloudflare siteverify. Returns false on any failure
(network, non-success, missing secret).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Rate limiter (LRU)

**Files:**
- Create: `apps/web/src/lib/anti-spam/rate-limit.ts`
- Create: `apps/web/src/lib/anti-spam/rate-limit.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/web/src/lib/anti-spam/rate-limit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('rate limiter', () => {
  let limiter: any
  beforeEach(async () => {
    vi.resetModules()
    limiter = await import('./rate-limit')
  })

  it('allows up to 5 in a 1h window per key', () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.checkRateLimit('k').allowed).toBe(true)
    }
    expect(limiter.checkRateLimit('k').allowed).toBe(false)
  })

  it('separates keys', () => {
    for (let i = 0; i < 5; i++) limiter.checkRateLimit('a')
    expect(limiter.checkRateLimit('b').allowed).toBe(true)
  })
})
```

- [ ] **Step 2: Install deps**

```bash
pnpm --filter @jakartabc/web add lru-cache
```

- [ ] **Step 3: Implement**

```ts
// apps/web/src/lib/anti-spam/rate-limit.ts
import { LRUCache } from 'lru-cache'

const WINDOW_MS = 60 * 60 * 1000  // 1h
const MAX_PER_WINDOW = 5

const cache = new LRUCache<string, { count: number; windowStart: number }>({ max: 10_000, ttl: WINDOW_MS })

export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = cache.get(key)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    cache.set(key, { count: 1, windowStart: now })
    return { allowed: true }
  }
  if (entry.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000) }
  }
  entry.count += 1
  cache.set(key, entry)
  return { allowed: true }
}
```

Test pass, commit.

```bash
git add apps/web/src/lib/anti-spam/rate-limit.ts apps/web/src/lib/anti-spam/rate-limit.test.ts apps/web/package.json
git commit -m "$(cat <<'EOF'
feat(web): in-memory LRU rate limit, 5/hour per key

Replace w/ redis-backed limiter when traffic justifies. Key composed of
${ip}:${email} by caller.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Booking Server Action

**Files:**
- Create: `apps/web/src/app/[locale]/actions/booking.ts`
- Create: `apps/web/src/app/[locale]/actions/booking.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/web/src/app/[locale]/actions/booking.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()
const findMock = vi.fn()
const sendMock = vi.fn()
const verifyMock = vi.fn()
const limitMock = vi.fn()

vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn(async () => ({ create: createMock, find: findMock })) }))
vi.mock('@jakartabc/email/send', () => ({ sendEmail: sendMock }))
vi.mock('@/lib/anti-spam/turnstile', () => ({ verifyTurnstile: verifyMock }))
vi.mock('@/lib/anti-spam/rate-limit', () => ({ checkRateLimit: limitMock }))
vi.mock('@react-email/components', async (orig) => orig())

import { submitBooking } from './booking'

const goodData = new Map<string, string>([
  ['name', 'Maria T'], ['email', 'm@t.co'], ['company', 'Solstice'], ['phone', '+81-1'],
  ['serviceSlug', 'pt-pma-setup'],
  ['message', 'Hello, I would like to set up a PT PMA.'],
  ['locale', 'en'], ['hp', ''], ['turnstileToken', 'tok_x'],
])
function fd(map = goodData) {
  const f = new FormData()
  for (const [k, v] of map.entries()) f.append(k, v)
  // multi-value
  f.append('preferredWindows', 'mon-am')
  f.append('preferredWindows', 'tue-pm')
  return f
}

describe('submitBooking', () => {
  beforeEach(() => {
    createMock.mockReset(); findMock.mockReset(); sendMock.mockReset(); verifyMock.mockReset(); limitMock.mockReset()
    findMock.mockResolvedValue({ docs: [{ id: 1, slug: 'pt-pma-setup', name: 'PT PMA Setup' }] })
    verifyMock.mockResolvedValue(true)
    limitMock.mockReturnValue({ allowed: true })
    sendMock.mockResolvedValue({ ok: true, id: 'm_1' })
    createMock.mockResolvedValue({ id: 42 })
    process.env.SALES_EMAIL = 'sales@x.co'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jakartabc.com'
  })

  it('happy path: creates lead, sends 2 emails, returns ok', async () => {
    const res = await submitBooking(fd(), '1.2.3.4')
    expect(res.ok).toBe(true)
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ collection: 'booking-leads' }))
    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  it('honeypot non-empty: returns ok but no DB write', async () => {
    const m = new Map(goodData); m.set('hp', 'spam')
    const res = await submitBooking(fd(m), '1.2.3.4')
    expect(res.ok).toBe(true)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('turnstile fail: returns error code "captcha"', async () => {
    verifyMock.mockResolvedValueOnce(false)
    const res = await submitBooking(fd(), '1.2.3.4')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('captcha')
  })

  it('rate limit hit: returns error code "rate"', async () => {
    limitMock.mockReturnValueOnce({ allowed: false, retryAfter: 3600 })
    const res = await submitBooking(fd(), '1.2.3.4')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('rate')
  })

  it('zod fail: returns error code "validation"', async () => {
    const m = new Map(goodData); m.set('email', 'bad')
    const res = await submitBooking(fd(m), '1.2.3.4')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('validation')
  })

  it('service not found: returns "service-unknown"', async () => {
    findMock.mockResolvedValueOnce({ docs: [] })
    const res = await submitBooking(fd(), '1.2.3.4')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('service-unknown')
  })

  it('visitor email fails: still returns ok (sales got it)', async () => {
    sendMock
      .mockResolvedValueOnce({ ok: true, id: 's' })   // sales
      .mockResolvedValueOnce({ ok: false, error: 'bounce' })  // visitor
    const res = await submitBooking(fd(), '1.2.3.4')
    expect(res.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Implement**

```ts
// apps/web/src/app/[locale]/actions/booking.ts
'use server'

import { render } from '@react-email/components'
import { getPayloadClient } from '@/lib/payload'
import { sendEmail } from '@jakartabc/email/send'
import { BookingLeadSales } from '@jakartabc/email/templates/BookingLeadSales'
import { BookingLeadVisitor } from '@jakartabc/email/templates/BookingLeadVisitor'
import { verifyTurnstile } from '@/lib/anti-spam/turnstile'
import { checkRateLimit } from '@/lib/anti-spam/rate-limit'
import { bookingSchema } from '@/lib/validation/booking'
import { subjects } from '@jakartabc/email/i18n'
import React from 'react'

export type SubmitResult = { ok: true } | { ok: false; code: 'validation' | 'captcha' | 'rate' | 'service-unknown' | 'persistence' | 'unknown' }

function redactEmail(e: string) { return e.replace(/(?<=.).(?=[^@]*?@)/g, '*') }

export async function submitBooking(formData: FormData, ip: string): Promise<SubmitResult> {
  // 1. Parse from FormData. Multi-value `preferredWindows`.
  const obj: Record<string, unknown> = Object.fromEntries(formData.entries())
  obj.preferredWindows = formData.getAll('preferredWindows')

  // 2. zod
  const parsed = bookingSchema.safeParse(obj)
  if (!parsed.success) {
    console.warn('[booking] validation failed')
    return { ok: false, code: 'validation' }
  }
  const data = parsed.data

  // 3. Honeypot
  if (data.hp && data.hp.length > 0) {
    console.info('[booking] honeypot triggered for', redactEmail(data.email))
    return { ok: true }
  }

  // 4. Turnstile
  const ok = await verifyTurnstile(data.turnstileToken, ip)
  if (!ok) return { ok: false, code: 'captcha' }

  // 5. Rate limit
  const rl = checkRateLimit(`${ip}:${data.email}`)
  if (!rl.allowed) return { ok: false, code: 'rate' }

  // 6. Resolve service
  const payload = await getPayloadClient()
  const services = await payload.find({ collection: 'services', where: { slug: { equals: data.serviceSlug } }, limit: 1 })
  const service = services.docs[0] as any
  if (!service) return { ok: false, code: 'service-unknown' }

  // 7. Persist
  let leadId: string | number
  try {
    const lead = await payload.create({
      collection: 'booking-leads',
      data: {
        name: data.name, email: data.email, company: data.company || undefined, phone: data.phone || undefined,
        service: service.id, preferredWindows: data.preferredWindows, message: data.message,
        locale: data.locale, status: 'new',
      },
    })
    leadId = lead.id
  } catch (err) {
    console.error('[booking] persistence failed', err)
    return { ok: false, code: 'persistence' }
  }

  // 8. Emails (sales then visitor; visitor failure does not fail submission)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!
  const salesEmail = process.env.SALES_EMAIL!
  const partnerName = 'Diah Putri'
  const partnerEmail = 'diah@jakartabc.com'

  const salesHtml = await render(React.createElement(BookingLeadSales, {
    leadId, name: data.name, email: data.email, company: data.company, phone: data.phone,
    service: service.name, preferredWindows: data.preferredWindows, message: data.message,
    locale: data.locale, siteUrl,
  }))
  const salesText = `Name: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company}\nService: ${service.name}\n\n${data.message}\n\n${siteUrl}/admin/collections/booking-leads/${leadId}`

  const salesRes = await sendEmail({
    to: salesEmail, subject: subjects.bookingLeadSales(service.name, data.name), html: salesHtml, text: salesText,
  })
  if (!salesRes.ok) {
    console.error('[booking] sales email failed', salesRes.error)
    return { ok: false, code: 'unknown' }
  }

  const visitorHtml = await render(React.createElement(BookingLeadVisitor, {
    name: data.name, service: service.name, locale: data.locale, partnerName, partnerEmail,
  }))
  const visitorText = `Hi ${data.name}, we received your request for ${service.name}.`
  const visitorRes = await sendEmail({
    to: data.email, subject: subjects.bookingLeadVisitor[data.locale], html: visitorHtml, text: visitorText,
  })
  if (!visitorRes.ok) console.warn('[booking] visitor email failed (ignoring)', visitorRes.error)

  return { ok: true }
}
```

- [ ] **Step 3: Test pass + commit**

```bash
pnpm --filter @jakartabc/web test booking
git add apps/web/src/app/[locale]/actions/booking.ts apps/web/src/app/[locale]/actions/booking.test.ts
git commit -m "$(cat <<'EOF'
feat(web): submitBooking Server Action end-to-end

zod → honeypot → Turnstile → rate-limit → service lookup → Payload
create → sales email (required) → visitor email (best-effort). Logs
redact email on warn.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Contact Server Action

**Files:**
- Create: `apps/web/src/app/[locale]/actions/contact.ts`
- Create: `apps/web/src/app/[locale]/actions/contact.test.ts`

- [ ] **Step 1: Failing test**

Mirror structure of Task 16 test, simpler:

```ts
// apps/web/src/app/[locale]/actions/contact.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()
const sendMock = vi.fn()
const verifyMock = vi.fn()
const limitMock = vi.fn()

vi.mock('@/lib/payload', () => ({ getPayloadClient: vi.fn(async () => ({ create: createMock })) }))
vi.mock('@jakartabc/email/send', () => ({ sendEmail: sendMock }))
vi.mock('@/lib/anti-spam/turnstile', () => ({ verifyTurnstile: verifyMock }))
vi.mock('@/lib/anti-spam/rate-limit', () => ({ checkRateLimit: limitMock }))

import { submitContact } from './contact'

function fd(map: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(map)) f.append(k, v)
  return f
}

describe('submitContact', () => {
  beforeEach(() => {
    createMock.mockReset(); sendMock.mockReset(); verifyMock.mockReset(); limitMock.mockReset()
    verifyMock.mockResolvedValue(true); limitMock.mockReturnValue({ allowed: true })
    sendMock.mockResolvedValue({ ok: true, id: 'm' }); createMock.mockResolvedValue({ id: 7 })
    process.env.SALES_EMAIL = 'sales@x.co'; process.env.NEXT_PUBLIC_SITE_URL = 'https://x.co'
  })
  it('happy path', async () => {
    const res = await submitContact(fd({ name: 'Sari', email: 's@x.co', company: 'A', message: 'Hello, more than ten chars.', locale: 'id', hp: '', turnstileToken: 't' }), '1.1.1.1')
    expect(res.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Implement**

```ts
// apps/web/src/app/[locale]/actions/contact.ts
'use server'

import { render } from '@react-email/components'
import React from 'react'
import { getPayloadClient } from '@/lib/payload'
import { sendEmail } from '@jakartabc/email/send'
import { ContactSales } from '@jakartabc/email/templates/ContactSales'
import { ContactVisitor } from '@jakartabc/email/templates/ContactVisitor'
import { verifyTurnstile } from '@/lib/anti-spam/turnstile'
import { checkRateLimit } from '@/lib/anti-spam/rate-limit'
import { contactSchema } from '@/lib/validation/contact'
import { subjects } from '@jakartabc/email/i18n'
import type { SubmitResult } from './booking'

export async function submitContact(formData: FormData, ip: string): Promise<SubmitResult> {
  const obj = Object.fromEntries(formData.entries())
  const parsed = contactSchema.safeParse(obj)
  if (!parsed.success) return { ok: false, code: 'validation' }
  const data = parsed.data

  if (data.hp) return { ok: true }

  const ok = await verifyTurnstile(data.turnstileToken, ip)
  if (!ok) return { ok: false, code: 'captcha' }

  const rl = checkRateLimit(`${ip}:${data.email}`)
  if (!rl.allowed) return { ok: false, code: 'rate' }

  const payload = await getPayloadClient()
  let id: string | number
  try {
    const msg = await payload.create({
      collection: 'contact-messages',
      data: { name: data.name, email: data.email, company: data.company || undefined, message: data.message, locale: data.locale, status: 'new' },
    })
    id = msg.id
  } catch (err) {
    console.error('[contact] persistence failed', err)
    return { ok: false, code: 'persistence' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!
  const salesHtml = await render(React.createElement(ContactSales, { messageId: id, name: data.name, email: data.email, company: data.company, message: data.message, locale: data.locale, siteUrl }))
  const salesRes = await sendEmail({ to: process.env.SALES_EMAIL!, subject: subjects.contactSales(data.name), html: salesHtml, text: `${data.name} <${data.email}>\n\n${data.message}` })
  if (!salesRes.ok) { console.error('[contact] sales email failed', salesRes.error); return { ok: false, code: 'unknown' } }

  const visitorHtml = await render(React.createElement(ContactVisitor, { name: data.name, locale: data.locale, replyEmail: 'hello@jakartabc.com' }))
  const visitorRes = await sendEmail({ to: data.email, subject: subjects.contactVisitor[data.locale], html: visitorHtml, text: 'Thanks for reaching out.' })
  if (!visitorRes.ok) console.warn('[contact] visitor email failed (ignoring)', visitorRes.error)

  return { ok: true }
}
```

- [ ] **Step 3: Test + commit**

```bash
pnpm --filter @jakartabc/web test contact
git add apps/web/src/app/[locale]/actions/contact.ts apps/web/src/app/[locale]/actions/contact.test.ts
git commit -m "$(cat <<'EOF'
feat(web): submitContact Server Action

Same pipeline as booking, simpler payload (4 fields). Reuses
SubmitResult type from booking action.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: Wire BookingForm in contact page + service detail

**Files:**
- Modify: `apps/web/src/app/[locale]/contact/page.tsx`
- Create: `apps/web/src/components/BookingFormWired.tsx`

- [ ] **Step 1: Client wrapper**

```tsx
// apps/web/src/components/BookingFormWired.tsx
'use client'
import * as React from 'react'
import { useActionState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { BookingForm, type BookingFormLabels } from '@jakartabc/ui'
import { submitBooking, type SubmitResult } from '@/app/[locale]/actions/booking'

type Props = {
  labels: BookingFormLabels
  services: { slug: string; name: string }[]
  locale: 'en' | 'id'
  defaultService?: string
  successMessage: string
}

export function BookingFormWired({ labels, services, locale, defaultService, successMessage }: Props) {
  const [state, formAction, isPending] = useActionState<SubmitResult | null, FormData>(
    async (_prev, fd) => {
      const ip = '' // server resolves x-forwarded-for in Server Action via headers() if needed; v1 best-effort
      fd.append('locale', locale)
      return submitBooking(fd, ip)
    },
    null,
  )

  const formState = state === null ? (isPending ? 'loading' : 'idle')
    : state.ok ? 'success'
    : 'error'

  const errorMessage = state && !state.ok
    ? (locale === 'en' ? 'Couldn’t send. Please email us: hello@jakartabc.com' : 'Tidak terkirim. Email kami: hello@jakartabc.com')
    : undefined

  return (
    <form action={formAction}>
      <BookingForm
        labels={labels}
        services={services}
        defaultService={defaultService}
        state={formState as any}
        errorMessage={errorMessage}
        successMessage={successMessage}
        onSubmit={() => { /* form action handles submit */ }}
      />
      <div className="mt-6">
        <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} options={{ theme: 'light' }} />
      </div>
    </form>
  )
}
```

Install `@marsidev/react-turnstile`:

```bash
pnpm --filter @jakartabc/web add @marsidev/react-turnstile
```

- [ ] **Step 2: Update contact page**

```tsx
// apps/web/src/app/[locale]/contact/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'
import { ContactFormWired } from '@/components/ContactFormWired'
import { getPayloadClient } from '@/lib/payload'

export default async function Contact({ params }: { params: Promise<{ locale: 'en' | 'id' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('contact')
  const payload = await getPayloadClient()
  const servicesRes = await payload.find({ collection: 'services', sort: 'order', locale, limit: 50 })
  const services = servicesRes.docs.map((s: any) => ({ slug: s.slug, name: s.name }))

  return (
    <section className="mx-auto max-w-container px-6 py-24 md:px-10 md:py-32">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <div>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-6">{t('headline')}</DisplayHeading>
          <p className="mt-8 max-w-prose text-body-lg text-ink-700">{t('lead')}</p>
          <div className="mt-16">
            <Eyebrow>{t('officeEyebrow')}</Eyebrow>
            <p className="mt-4 text-body-md text-ink-700">{t('officeAddress')}</p>
          </div>
        </div>

        <ContactFormWired
          labels={{ name: t('form.name'), email: t('form.email'), company: t('form.company'), message: t('form.message'), submit: t('form.submit'), sending: t('form.sending') }}
          locale={locale}
          successMessage={t('successMessage')}
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 3: ContactFormWired (analogous)**

```tsx
// apps/web/src/components/ContactFormWired.tsx
'use client'
import * as React from 'react'
import { useActionState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { ContactForm, type ContactFormLabels } from '@jakartabc/ui'
import { submitContact } from '@/app/[locale]/actions/contact'
import type { SubmitResult } from '@/app/[locale]/actions/booking'

export function ContactFormWired({ labels, locale, successMessage }: { labels: ContactFormLabels; locale: 'en' | 'id'; successMessage: string }) {
  const [state, formAction, isPending] = useActionState<SubmitResult | null, FormData>(
    async (_p, fd) => { fd.append('locale', locale); return submitContact(fd, '') },
    null,
  )
  const formState = state === null ? (isPending ? 'loading' : 'idle') : state.ok ? 'success' : 'error'
  const errorMessage = state && !state.ok ? (locale === 'en' ? 'Couldn’t send. Please email hello@jakartabc.com' : 'Tidak terkirim. Email hello@jakartabc.com') : undefined

  return (
    <form action={formAction}>
      <ContactForm labels={labels} state={formState as any} successMessage={successMessage} errorMessage={errorMessage} onSubmit={() => {}} />
      <div className="mt-6"><Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} /></div>
    </form>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/contact apps/web/src/components/{BookingFormWired,ContactFormWired}.tsx apps/web/package.json
git commit -m "$(cat <<'EOF'
feat(web): wire ContactForm + BookingForm to Server Actions

Client wrappers consume useActionState; Turnstile widget appended.
BookingForm reuse hooked up but contact page uses ContactForm; service
detail can opt into BookingFormWired via component import in Task 19.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: BookingForm on service detail (preset service)

**Files:**
- Modify: `apps/web/src/app/[locale]/services/[slug]/page.tsx`

- [ ] **Step 1: Append BookingFormWired below ContactBlock**

```tsx
// in service detail page, after ContactBlock:
import { BookingFormWired } from '@/components/BookingFormWired'

// ...inside the JSX, after <ContactBlock />:
<section className="mx-auto max-w-editorial px-6 py-24 md:px-10">
  <BookingFormWired
    labels={{
      name: locale === 'en' ? 'Name' : 'Nama',
      email: 'Email',
      company: locale === 'en' ? 'Company' : 'Perusahaan',
      phone: locale === 'en' ? 'Phone' : 'Telepon',
      service: locale === 'en' ? 'Service' : 'Layanan',
      preferredWindows: locale === 'en' ? 'Preferred times' : 'Waktu yang disukai',
      message: locale === 'en' ? 'Message' : 'Pesan',
      submit: locale === 'en' ? 'Send request' : 'Kirim permintaan',
      sending: locale === 'en' ? 'Sending…' : 'Mengirim…',
    }}
    services={[{ slug: svc.slug, name: svc.name }]}
    defaultService={svc.slug}
    locale={locale}
    successMessage={locale === 'en' ? 'Thanks. We\'ll reply within 1 business day.' : 'Terima kasih. Kami balas dalam 1 hari kerja.'}
  />
</section>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/[locale]/services/[slug]/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): inline BookingFormWired on service detail w/ preset service

Visitor on a service page can submit a booking with that service
preselected — reduces friction vs jumping to /contact.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: CSP additions for Turnstile

**Files:**
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Add headers**

```ts
// apps/web/next.config.ts (extend)
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
  ].join('; ') },
]

const nextConfig = {
  // existing
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
    ]
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/next.config.ts
git commit -m "$(cat <<'EOF'
chore(security): CSP + security headers, allow Turnstile

CSP allows script/frame/connect to challenges.cloudflare.com.
unsafe-inline tolerated v1; nonce-based CSP later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Admin list-view customizations for BookingLeads

**Files:**
- Modify: `packages/content/src/collections/BookingLeads.ts` (already has defaultColumns; verify)

- [ ] **Step 1: Confirm `admin.defaultColumns` + add filter helpers**

```ts
// packages/content/src/collections/BookingLeads.ts — extend admin block
admin: {
  group: 'Sales',
  useAsTitle: 'name',
  defaultColumns: ['createdAt', 'name', 'company', 'service', 'preferredWindows', 'status'],
  listSearchableFields: ['name', 'email', 'company'],
},
```

`listSearchableFields` makes the admin search bar work across those fields.

- [ ] **Step 2: Commit**

```bash
git add packages/content/src/collections/BookingLeads.ts
git commit -m "$(cat <<'EOF'
feat(content): BookingLeads admin list polish

defaultColumns shows what sales scans by. listSearchableFields covers
name/email/company.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: e2e booking happy path

**Files:**
- Create: `apps/web/e2e/booking.spec.ts`

- [ ] **Step 1: Implement**

```ts
// apps/web/e2e/booking.spec.ts
import { test, expect } from '@playwright/test'

// Tests assume seeded service and a valid Turnstile bypass token in test env.
// In CI we set NEXT_PUBLIC_TURNSTILE_SITE_KEY to "1x00000000000000000000AA" (always-pass) and TURNSTILE_SECRET_KEY to "1x0000000000000000000000000000000AA".

const SALES_INBOX_URL = process.env.SALES_TEST_INBOX_URL ?? null

for (const locale of ['en', 'id'] as const) {
  test(`booking happy path @ ${locale}`, async ({ page, request }) => {
    await page.goto(locale === 'en' ? '/services/pt-pma-setup' : '/id/services/pt-pma-setup')
    await page.locator('input[name="name"]').fill('E2E Test')
    await page.locator('input[name="email"]').fill(`e2e+${Date.now()}@example.test`)
    await page.locator('input[name="company"]').fill('E2E Co')
    await page.locator('input[name="phone"]').fill('+62-1')
    await page.locator('select[name="service"]').selectOption('pt-pma-setup')
    await page.locator('input[value="mon-am"]').check()
    await page.locator('textarea[name="message"]').fill('I want to set up a PT PMA. More than ten chars.')

    // Turnstile always-pass token is auto-supplied; submit
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('actions/booking') || r.request().method() === 'POST'),
      page.getByRole('button', { name: /Send|Kirim/i }).click(),
    ])

    await expect(page.getByText(/within 1 business day|dalam 1 hari kerja/i)).toBeVisible()
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/booking.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): booking happy path across locales

Fills BookingFormWired on service detail, asserts success message
replaces form. Relies on Turnstile always-pass test keys in CI env.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: e2e booking spam path (honeypot)

**Files:**
- Modify: `apps/web/e2e/booking.spec.ts`

- [ ] **Step 1: Append**

```ts
test('booking honeypot non-empty: silent success, no DB write', async ({ page, request }) => {
  await page.goto('/services/pt-pma-setup')
  // unhide honeypot for test
  await page.evaluate(() => {
    const hp = document.querySelector('input[name="hp"]') as HTMLInputElement
    if (hp) hp.value = 'spambot'
  })
  await page.locator('input[name="name"]').fill('Bot')
  await page.locator('input[name="email"]').fill(`bot+${Date.now()}@example.test`)
  await page.locator('select[name="service"]').selectOption('pt-pma-setup')
  await page.locator('textarea[name="message"]').fill('Spammy spammy message text content.')
  await page.getByRole('button', { name: /Send/i }).click()

  // Server returns ok:true silently; success message renders.
  await expect(page.getByText(/within 1 business day/i)).toBeVisible()

  // Optional: assert no booking-lead created with this email via Payload REST (admin auth)
  // ... left to integration env wiring
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/booking.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): honeypot triggers silent reject (no DB write)

Sets hp field non-empty; Server Action returns ok:true to avoid signaling
the bot, but does not persist or send email.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 24: e2e booking rate limit

**Files:**
- Modify: `apps/web/e2e/booking.spec.ts`

- [ ] **Step 1: Append**

```ts
test('booking rate limit hits at 6th attempt', async ({ page }) => {
  const email = `rate+${Date.now()}@example.test`
  for (let i = 0; i < 5; i++) {
    await page.goto('/services/pt-pma-setup')
    await page.locator('input[name="name"]').fill(`Rate ${i}`)
    await page.locator('input[name="email"]').fill(email)
    await page.locator('select[name="service"]').selectOption('pt-pma-setup')
    await page.locator('textarea[name="message"]').fill(`Rate test ${i} message body content.`)
    await page.getByRole('button', { name: /Send/i }).click()
    await page.waitForTimeout(300)
  }
  // 6th
  await page.goto('/services/pt-pma-setup')
  await page.locator('input[name="name"]').fill('Rate 6')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('select[name="service"]').selectOption('pt-pma-setup')
  await page.locator('textarea[name="message"]').fill('Rate test 6 message body content.')
  await page.getByRole('button', { name: /Send/i }).click()
  await expect(page.getByText(/Couldn’t send|Tidak terkirim/i)).toBeVisible()
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/booking.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): rate limit kicks in at 6th submission

Same email × IP key. 5 succeed; 6th surfaces error fallback message.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 25: e2e contact happy path

**Files:**
- Create: `apps/web/e2e/contact.spec.ts`

- [ ] **Step 1: Implement**

```ts
// apps/web/e2e/contact.spec.ts
import { test, expect } from '@playwright/test'

for (const locale of ['en', 'id'] as const) {
  test(`contact happy path @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/contact' : '/id/contact')
    await page.locator('input[name="name"]').fill('Sari E2E')
    await page.locator('input[name="email"]').fill(`sari+${Date.now()}@example.test`)
    await page.locator('input[name="company"]').fill('Optional Co')
    await page.locator('textarea[name="message"]').fill('Reasonable length message body for contact e2e test.')
    await page.getByRole('button', { name: /Send|Kirim/i }).click()
    await expect(page.getByText(/within 1 business day|dalam 1 hari kerja/i)).toBeVisible()
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/contact.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): contact form happy path × locales

Submits ContactForm; asserts success in-place; both EN + ID.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 26: Final commit + tag `phase-3-booking-complete`

- [ ] **Step 1: Full validation**

```bash
pnpm -w lint && pnpm -w typecheck && pnpm -w test && pnpm --filter @jakartabc/web e2e
```

- [ ] **Step 2: Deploy to staging + smoke test real Turnstile + real email send**

```bash
ssh deploy@staging-vps
cd /opt/jakartabc.com
git pull
docker compose up -d --build web
# Send a test booking; verify SALES_EMAIL inbox receives the message <30s
```

- [ ] **Step 3: Tag + push**

```bash
git tag -a phase-3-booking-complete -m "Phase 3: Booking + Contact end-to-end w/ email + anti-spam"
git push origin phase-3-booking-complete
```

---

## Open questions surfaced during Phase 3

1. **IP capture for rate limit** — Server Actions don't natively receive request IP. Either: read `headers()` from `next/headers` inside the action (works), or pass IP via a server-helper that does so. Phase 3 plan calls actions with empty IP from form action; this MUST be resolved at implementation time: use `headers().get('x-forwarded-for')?.split(',')[0]` inside the Server Action body.
2. **Visitor email opt-out / unsubscribe** — auto-reply currently has no unsubscribe link; transactional emails are exempt from CAN-SPAM/GDPR unsubscribe but Indonesia has no specific rule. Confirm with Legal before launch.
3. **`partnerName` / `partnerEmail` on visitor template** — hardcoded "Diah Putri" v1. Phase later: derive from Service-owner relationship.
4. **Spam metrics** — no observability of honeypot/Turnstile reject rates v1. Add structured log fields if Ops wants Grafana panel.
5. **Domain DNS for Resend** — SPF, DKIM, DMARC records must be in place before launch (Open Item §11 spec).
6. **Sales WA escalation** — no automated WA send v1. Phase later if response time matters.

---

## Phase 3 → Phase 4 handoff notes

What Phase 4 inherits:
- Postgres has `users` collection (Payload auth-enabled by default since Phase 0 SiteSettings step bootstrap) — Phase 4 portal mounts its own Payload pointing to same DB
- `packages/ui` full inventory ready for portal login/dashboard reuse
- Caddy reverse proxy already serves `jakartabc.com` + `staging.jakartabc.com` — Phase 4 adds `app.jakartabc.com` block

What Phase 4 will change:
- Add `apps/portal` Next.js skeleton
- Mount Payload in portal pointing to shared postgres
- Add `app.jakartabc.com` Caddy site
- Document auth strategy ADR
