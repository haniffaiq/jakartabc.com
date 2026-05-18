# jakartabc.com — Implementation Design Spec

> Version 0.1 · 2026-05-18
> Status: design approved, pending implementation plan
> Companion doc: `design-system.md` (brand, visual, UX system v0.2)

This spec defines the technical architecture, phases, data model, components, and operational decisions for building `jakartabc.com`. The visual/brand system is owned by `design-system.md` and is referenced here, not duplicated.

---

## 1. Goals & Scope

### 1.1 Product

Marketing-and-services site for **Jakarta Business Center (BC)** — foreign direct investment consulting in Indonesia. Audience: foreign investors evaluating PT PMA setup, sector licensing, tax/accounting, KITAS.

### 1.2 In-scope (this spec)

Single spec, four implementation phases, mappable to team/agent assignment:

- **Phase 0** — Foundation (monorepo, deploy pipeline, tokens, base components, Payload mount)
- **Phase 1** — Marketing pages bilingual EN/ID, static content via MDX
- **Phase 2** — CMS Insights & Services content via Payload v3
- **Phase 3** — Booking lead form + Contact form, postgres + transactional email
- **Phase 4** — Client portal skeleton (subdomain, auth boundary). Full portal implementation deferred to its own spec.

### 1.3 Out of scope v1

- Full client portal (doc upload, PT PMA setup tracking) — separate spec after Phase 4 skeleton
- CRM integration, newsletter delivery, search, A/B testing, analytics, multi-region, CDN edge
- Custom Jakarta photography (using editorial stock v1; custom shoot phase later)

### 1.4 Success criteria

- Visitor can read all 7 marketing pages bilingual at production URL
- Editor non-dev can publish bilingual Insights article without touching code
- Visitor can submit booking lead → sales receives email <30s, lead persisted in admin
- Lighthouse perf+a11y ≥90, performance budget per design system §22 enforced in CI
- Design system §11 anti-AI compliance checklist passed
- Deployable via `docker compose up -d` on a single Ubuntu VPS

---

## 2. Decisions Locked

| Aspect | Decision | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router | User preference; ecosystem maturity; SSG + ISR fit |
| Styling | Tailwind CSS with token preset from `packages/ui` | Design system §14 |
| i18n | Bilingual EN/ID from day 1 via next-intl | Audience: foreign investors + local regulated sectors |
| CMS | Payload v3, self-hosted Docker, mounted in Next.js | User preference (self-host Docker); Payload v3 native Next.js mount |
| Database | Postgres 16 (single instance) | Shared by Payload + booking/contact persistence |
| Booking model | Custom lead form + sales callback (not real-time scheduler) | User decision; trade-off vs design system §19.5 noted as conscious deviation |
| Booking persistence | Postgres (same DB as CMS) + transactional email | Single DB simplifies ops |
| Email | Resend SDK (swappable to SMTP via env) | DX, deliverability, dev-friendly templates with React Email |
| Anti-spam | Honeypot + Cloudflare Turnstile + IP rate limit | Privacy-friendly (no Google reCAPTCHA), fits §11 anti-AI principle |
| Deploy | Single VPS, docker-compose, Caddy reverse proxy + auto TLS | User preference (self-host); minimal ops |
| Repo layout | pnpm workspace monorepo (apps/ + packages/), optional Turborepo build cache | Future portal app reuses `packages/ui`; package boundary = team handoff |
| Brand name | Jakarta Business Center (BC = Business Center) | User decision |
| Logo | Wordmark + monogram | User decision; monogram glyph TBD by brand/design |
| Photography v1 | Editorial stock (Stocksy / Cavan) | User decision; custom shoot phase later |
| Analytics | Skip v1 | User decision; Plausible/Umami self-host phase later |
| Client portal | Phase 4 skeleton only (subdomain + auth boundary) | De-risk; full portal in separate spec |

### 2.1 Conscious deviations from `design-system.md`

- **§19.5 booking model.** Spec uses lead form + sales callback instead of real-time scheduler. Risk: friction higher than design system intent. Mitigation: revisit phase 5 if lead-to-call conversion suffers.

---

## 3. Architecture

### 3.1 Repo layout

```
jakartabc.com/                          # monorepo root, pnpm workspace
├── apps/
│   ├── web/                            # Next.js 15 App Router (marketing + CMS admin + API)
│   │   ├── src/app/
│   │   │   ├── (marketing)/[locale]/   # /, /services, /services/[slug], /pricing,
│   │   │   │                           # /about, /insights, /insights/[slug], /contact
│   │   │   ├── (payload)/admin/        # Payload admin UI mounted
│   │   │   ├── api/                    # /api/booking, /api/contact, Payload REST auto-mounted
│   │   │   └── layout.tsx              # i18n provider, font preload (Fraunces, Inter)
│   │   ├── payload.config.ts
│   │   ├── next.config.ts              # next-intl plugin, image config
│   │   └── Dockerfile
│   └── portal/                         # Phase 4. v1 deliverable: skeleton + README placeholder
├── packages/
│   ├── ui/                             # Design tokens + base components
│   │   ├── src/tokens/                 # colors.css, typography.css, spacing.css
│   │   ├── src/components/             # Button, Card, Input, NavBar, FooterBlock, Hero,
│   │   │                               # EditorialList, PricingTable, EditorialTimeline,
│   │   │                               # MobileMenu, StickyTOC, EditorialQuote, …
│   │   ├── tailwind-preset.ts
│   │   └── package.json
│   ├── content/                        # Payload collections + generated types
│   │   ├── src/collections/            # Insights, Services, Authors, Categories,
│   │   │                               # Media, Regulations, BookingLeads, ContactMessages
│   │   ├── src/globals/                # SiteSettings, NavMenu, Footer
│   │   └── src/generated/payload-types.ts
│   ├── email/                          # React Email templates
│   │   ├── src/templates/              # BookingLeadSales, BookingLeadVisitor,
│   │   │                               # ContactSales, ContactVisitor
│   │   └── src/send.ts                 # Resend wrapper (swappable to SMTP)
│   └── config/                         # eslint-config, tsconfig-base, prettier, tailwind preset
├── docker-compose.yml                  # postgres + web + caddy
├── docker-compose.dev.yml              # dev override (no caddy, hot-reload mount)
├── caddy/Caddyfile
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── README.md                           # setup + deploy + backup runbook
```

### 3.2 Runtime topology (production)

```
Internet ──► Caddy :443 (TLS, Let's Encrypt) ──► web container :3000 (Next.js)
                                                       │
                                                       ▼ Payload local API (in-process)
                                                 postgres container :5432 (internal network)

Phase 4: Caddy routes app.jakartabc.com ──► portal container :3001
```

### 3.3 docker-compose services

- `postgres` — `postgres:16-alpine`, volume `pgdata`, internal port 5432, env from `.env`
- `web` — Next.js standalone build, internal port 3000, depends_on postgres, env from `.env`
- `caddy` — `caddy:2-alpine`, ports 80/443, auto-TLS, reverse proxy to `web:3000` and (phase 4) `portal:3001`
- Phase 4: `portal` — own container, internal port 3001

### 3.4 Environment variables (`apps/web`)

```
DATABASE_URL          # postgres://jakartabc:***@postgres:5432/jakartabc
PAYLOAD_SECRET        # 32+ char random; rotation invalidates sessions
NEXT_PUBLIC_SITE_URL  # https://jakartabc.com
DEFAULT_LOCALE        # en
RESEND_API_KEY        # if EMAIL_PROVIDER=resend
EMAIL_PROVIDER        # resend | smtp
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  # if EMAIL_PROVIDER=smtp
EMAIL_FROM            # "Jakarta Business Center <hello@jakartabc.com>"
SALES_EMAIL           # internal recipient for booking/contact notifications
TURNSTILE_SECRET_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
REVALIDATE_SECRET     # shared secret for /api/revalidate webhook
```

---

## 4. Phase Breakdown

Each phase is an independently deliverable, testable, deployable unit (except Phase 0 which is foundation).

### Phase 0 — Foundation (1 sprint, blocker)

Deliverable: monorepo bootstrapped, deploy pipeline working, 1 placeholder page live at `staging.jakartabc.com`.

Tasks:
- pnpm workspace + (optional) Turborepo init
- `packages/config` — eslint, tsconfig-base, prettier, tailwind preset
- `packages/ui` — token CSS vars + Tailwind preset (mapping `design-system.md` §4 §5 §6), base components stub (Button, Card, Input)
- `apps/web` — Next.js 15 App Router skeleton, next-intl setup (EN/ID), font self-host (Fraunces + Inter via `next/font`)
- Payload v3 mount at `/admin` with postgres adapter, 1 collection sanity test (`SiteSettings`)
- `docker-compose.yml` + `Dockerfile` web + `Caddyfile`
- VPS provision + staging deploy with TLS
- CI (GitHub Actions): lint, typecheck, build per PR
- README with local setup + deploy + backup runbook

Done when: placeholder page renders at staging URL; admin login works.

### Phase 1 — Marketing pages static (2 sprints)

Deliverable: 7 marketing pages live, bilingual EN/ID, content hardcoded in MDX or locale JSON.

Tasks:
- `packages/ui` full inventory (see §6)
- Pages: Home, Services (overview), Pricing, About, Contact (form stub, no submit yet), 404, 500
- Service detail template (`design-system.md` §21.1), content as MDX, 4 services hardcoded
- next-intl: copy in `messages/en.json` + `messages/id.json`; lang toggle in nav
- State matrix per `design-system.md` §20: 7 states per interactive component
- Performance budget audit (§22) enforced via Lighthouse CI

Done when: 7 pages bilingual, mobile responsive, Lighthouse perf+a11y ≥90, §11 anti-AI checklist passed.

### Phase 2 — CMS Insights & Services content (1.5 sprints)

Deliverable: Insights publishable via Payload, Service detail editable by non-dev.

Tasks:
- Payload collections: `Insights`, `Authors`, `Categories`, `Media`, `Services`, `Regulations`
- Localization: field-level i18n (EN/ID per field, Payload native)
- Insights list `/insights` + detail `/insights/[slug]` (§21.2 template)
- Migrate 4 service details from MDX to Payload `Services` collection
- Rich-text features: drop cap, pull quote, regulations cited footer (§19.4)
- Admin onboarding doc: how to write/publish bilingual article

Done when: editor non-dev publishes bilingual article end-to-end without code change.

### Phase 3 — Booking + Contact (1 sprint)

Deliverable: lead capture end-to-end, email to sales + visitor, lead persisted in admin.

Tasks:
- Payload collections: `BookingLeads`, `ContactMessages`
- Form fields (booking): name, email, company, phone (optional), service (FK), preferred windows (multi-select), message
- Form fields (contact): name, email, company, message
- API: Next.js Server Actions or `/api/booking`, `/api/contact` with zod validation
- React Email templates: `BookingLeadSales`, `BookingLeadVisitor`, `ContactSales`, `ContactVisitor`
- Email provider: Resend (default), SMTP fallback via env
- Anti-spam: honeypot + Turnstile + IP rate limit (5/hour)
- Success state inline (no modal); error state with email fallback
- Admin: sales-friendly list view + status (`new` / `contacted` / `converted` / `dropped`) + internal notes

Done when: visitor submits form → sales receives email <30s; lead appears in admin with status `new`.

### Phase 4 — Client portal skeleton (separate scope)

v1 deliverable: subdomain alive, login placeholder, auth boundary documented. Full portal = separate spec.

Tasks:
- `apps/portal/` Next.js skeleton
- Caddy routes `app.jakartabc.com` to portal container
- Auth decision: shared Payload user table vs separate (document choice in Phase 4 spec)
- Login page placeholder; no doc upload, no setup tracking yet (deferred)

Done when: subdomain serves login placeholder over TLS; auth strategy decision documented.

### Phase dependency graph

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3
                │
                └──────► Phase 4 (parallel after Phase 1 stable)
```

Phase 3 depends on Phase 2 (`Services` collection for booking service dropdown). Phase 4 can run parallel to Phase 2/3 once `packages/ui` is stable.

---

## 5. Data Model

### 5.1 Payload collections (`packages/content/src/collections/`)

```
Insights
├── slug              text, unique, not localized
├── title             text, localized (EN, ID)
├── lead              textarea, localized
├── body              richText (lexical), localized; blocks: paragraph, heading, dropCap, pullQuote, image, regulationCite
├── category          relationship → Categories (single)
├── author            relationship → Authors (single)
├── coverImage        relationship → Media
├── regulationsCited  relationship → Regulations (hasMany)
├── publishedAt       date
├── estReadTime       number; auto-calc via afterChange hook (words / 200)
├── status            select: draft | published
└── seo               group, localized: metaTitle, metaDescription

Services
├── slug              text, unique
├── order             number  (for §18.2 "01..04" listing)
├── name              text, localized
├── timelineLabel     text, localized  ("4–6 wks")
├── leadParagraph     textarea, localized
├── overview          richText, localized
├── whoFor            array<{ persona, desc }>, localized
├── requirements      array<{ label }>, localized   (renders downloadable checklist PDF)
├── timelineSteps     array<{ week, label, who, docs }>, localized
├── pricing           group: govFee, ourFee, currency
├── faq               array<{ q, a }>, localized
├── regulationsCited  relationship → Regulations (hasMany)
└── outsideScope      textarea, localized   (§25 "Honest")

Authors
├── name, role, bio (localized), photo, linkedinUrl, email

Categories
├── slug, name (localized)

Regulations
├── code              text  ("BKPM Reg 5/2025")
├── title             text, localized
├── url               text  (link to official source)
├── effectiveDate     date
└── notes             richText, localized

Media
├── file              upload; local volume /uploads (S3 adapter optional phase later)
├── alt               text, localized, required
└── caption           text, localized

BookingLeads        (Phase 3)
├── name, email, company, phone?
├── service           relationship → Services
├── preferredWindows  array<select: mon-am, mon-pm, tue-am, …>
├── message           textarea
├── locale            select: en | id  (captured from request)
├── status            select: new | contacted | converted | dropped (default new)
├── notes             textarea (internal, sales)
└── createdAt         auto

ContactMessages     (Phase 3)
├── name, email, company, message, locale, status, notes, createdAt

Globals:
SiteSettings   — brand name, tagline, default locale, social links
NavMenu        — array of menu items, localized labels
Footer         — address, licenses (rich text), email, social, legal links
```

### 5.2 i18n storage

Payload field-level localization (native). Postgres stores translations in companion `_locales` tables per collection. Single content row, multiple locale values. Fetched via `?locale=en` or `?locale=id`.

### 5.3 Rendering strategy

| Page | Strategy | Reason |
|---|---|---|
| `/`, `/about`, `/contact` | SSG (static) | Content rarely changes; rebuild on publish hook |
| `/services`, `/services/[slug]`, `/pricing` | SSG + on-demand revalidate | Editor publish → webhook triggers revalidate. `/pricing` reads pricing fields from `Services` collection (Phase 2+). |
| `/insights` (list) | ISR 60s | Balance freshness vs cache |
| `/insights/[slug]` | SSG + on-demand revalidate | Stable URL, editorial cadence is slow |
| `/[locale]/*` variants | Same per locale | next-intl |
| `/api/booking`, `/api/contact` | Dynamic (Node runtime) | DB writes |
| `/admin/*` | Dynamic (Payload-owned) | Admin UI |

### 5.4 Revalidation flow

Payload `afterChange` hook on `Insights`, `Services`, `SiteSettings`, `NavMenu`, `Footer` → internal POST `/api/revalidate` with `REVALIDATE_SECRET` → Next.js `revalidateTag()`.

Cache tags:
- `insights:list`, `insights:slug:<slug>`
- `services:list`, `services:slug:<slug>`
- `site:settings`, `site:nav`, `site:footer`

### 5.5 Content flow

```
Editor → Payload admin (/admin) → postgres write
                                      │
                                      ▼ afterChange → /api/revalidate → revalidateTag()
Next.js page (SSG/ISR) → Payload local API (in-process, no HTTP hop)
                                      │
                                      ▼ render bilingual page

Visitor form submit → Server Action / /api/booking POST
                          │ zod validate
                          │ honeypot + Turnstile + rate limit
                          │ payload.create(BookingLeads, {...})
                          │ sendEmail({ template: BookingLeadSales, to: SALES_EMAIL })
                          │ sendEmail({ template: BookingLeadVisitor, to: visitor.email })
                          ▼ return success → in-place message
```

---

## 6. Components & Tokens (`packages/ui`)

### 6.1 Token wiring

CSS vars from `design-system.md` §4–§6 live in `packages/ui/src/tokens/`. Tailwind preset (`tailwind-preset.ts`) maps to utility classes via `theme.extend`. Apps consume preset via:

```ts
// apps/web/tailwind.config.ts
import preset from '@jakartabc/ui/tailwind-preset'
export default { presets: [preset], content: [...] }
```

### 6.2 Component inventory

| Component | Source | Notes |
|---|---|---|
| `Button` | §7.1, §20 | Variants: primary, secondary, ghost, link. Props: `as?`, `href?`, `loading?`. Loading = mono `·` rotating. |
| `Input`, `Textarea`, `Select` | §7.3 | Bottom-border only. Label above (eyebrow). Inline error. |
| `Card` | §7.2 | `--bone-100` bg, radius 6, no shadow (subtle hover optional). |
| `NavBar` | §7.4, §18.1 | Sticky 72/64; border-bottom on scroll; logo + nav + CTA + lang toggle. |
| `MobileMenu` | §18.5 | Full-screen takeover, display-md per item. |
| `FooterBlock` | §12, §24 | Optional dark variant; address + licenses + email + lang toggle + newsletter (no modal). |
| `Hero` | §7.5, §18.1 | Slots: eyebrow, headline, lead, primary CTA, secondary ghost. No bg image. |
| `EditorialList` | §18.2 | Numbered list, rule dividers, timeline label, "Read →". |
| `PricingTable` | §18.4 | Tabular-nums; alternating rows; ochre bold total. |
| `EditorialTimeline` | §19.2 | Vertical timeline: bullet, week label, who (we/joint/you), docs. |
| `EditorialQuote` | §7.7 | Serif large quote + attribution. |
| `Eyebrow` | §5 | Uppercase, tracking 0.08em. |
| `DisplayHeading` | §5 | Serif display-xl/lg/md slot. |
| `RuleDivider` | §11 | `--rule-soft` horizontal line. |
| `StickyTOC` | §18.3, §19.3 | Service detail sidebar; highlights current section on scroll. |
| `InsightCard` | §21.2 | Category · date · est read time. |
| `ContactBlock` | §19.8 | Inline contact at section end: partner photo + name + email + WA link. |
| `BookingForm` | Phase 3 | Lead form (see §5.1 BookingLeads). |
| `ContactForm` | Phase 3 | 4 fields per §12 Contact. |
| `LangToggle` | §19.6 | "EN · ID" eyebrow; preserves current path. |
| `LocalizedLink` | next-intl | Locale-aware Next Link wrapper. |

### 6.3 State matrix enforcement (`design-system.md` §20)

Each interactive component implements 7 states: default, hover, focus, active, disabled, loading, error. Unit tests assert each state visually (Vitest + Testing Library snapshots) and behaviorally. Optional internal `/dev/components` route (gated by env) renders state reference.

### 6.4 i18n routing

```
URL pattern                      Locale | Default
/                                en       (no prefix = default)
/id                              id
/services                        en
/id/services                     id
/services/pt-pma-setup           en
/id/services/pt-pma-setup        id
/insights/[slug]                 en
/id/insights/[slug]              id
```

`middleware.ts` (next-intl) detects locale from URL prefix. `en` is default and unprefixed; `id` prefixed `/id`. Lang toggle preserves path.

**Slug strategy: same slug per locale (English slugs).** Investor foreign primary audience; English slugs are more SEO-portable and shareable. Localized slugs (`/id/jasa/...`) considered and rejected for routing complexity and broken cross-locale links.

### 6.5 Font loading

```ts
import { Fraunces, Inter } from 'next/font/google'
const fraunces = Fraunces({ subsets:['latin'], variable:'--font-display', display:'swap', weight:['400','500'] })
const inter    = Inter   ({ subsets:['latin'], variable:'--font-body',    display:'swap', weight:['400','500'] })
```

Preload: Fraunces 400 (hero), Inter 400 (body). JetBrains Mono lazy.

### 6.6 Image strategy

`next/image` + AVIF + WebP fallback. Hero `priority` + `blurDataURL`. Editorial stock stored in Payload `Media` (uploaded by editor); decorative assets in `apps/web/public/images/`. Image audit script fails CI if `public/images/*` >200kb after AVIF.

### 6.7 Accessibility (`design-system.md` §13)

- Focus visible utility: outline `--ochre-600` 2px offset 2px (no `outline: none` without replacement)
- Semantic HTML enforced via ESLint `jsx-a11y`
- `prefers-reduced-motion` respected (disables reveal animations)
- `alt` field required at Payload schema level on `Media`
- Contrast and semantic validation in e2e via `@axe-core/playwright`

---

## 7. Error / Empty / Loading States (`design-system.md` §23)

| State | Implementation | Location |
|---|---|---|
| 404 | `not-found.tsx` per locale: display serif "This page isn't here." + links to Home/Services/Insights. No illustration. | `apps/web/src/app/[locale]/not-found.tsx` |
| 500 / runtime error | `error.tsx` global: "Something on our end isn't working." + email fallback link. | `apps/web/src/app/[locale]/error.tsx` |
| Insights empty (category) | "No articles yet in this category." + popular category links. | `apps/web/src/app/[locale]/insights/page.tsx` |
| Form loading | Button → ochre-700 + mono `·` rotating + text "Sending…". | `Button` `loading` prop |
| Form success | Replace form DOM with: "Thanks. We'll reply within 1 business day." (locale-aware). | `BookingForm`, `ContactForm` |
| Form field error | Bottom border `--danger` + helper text below. | `Input` error state |
| Image loading | `next/image` blur placeholder, fade-in 300ms. | Built-in |
| ISR skeleton (Insights list) | Typography-shape skeleton (eyebrow + headline shape). | `InsightCardSkeleton` |

---

## 8. Booking & Contact (Phase 3) — Detailed Flow

### 8.1 Submission flow

```
1. Visitor on /contact or service detail
2. BookingForm submit:
   { name, email, company, phone?, serviceSlug, preferredWindows[], message, locale, hp, turnstileToken }
3. Client: zod validate → POST (Server Action recommended)
4. Server:
   a. zod re-validate (server boundary)
   b. honeypot check (`hp` must be empty)
   c. Turnstile token verify (server-side call to Cloudflare)
   d. rate limit: 5 submissions / IP / hour (in-memory LRU; redis phase later)
   e. payload.create({ collection: 'BookingLeads', data: {...status: 'new'} })
   f. sendEmail({ template: 'BookingLeadSales',   to: SALES_EMAIL,    data, locale })
   g. sendEmail({ template: 'BookingLeadVisitor', to: visitor.email,  data, locale })
   h. return { ok: true }
5. Client: replace form with success message
6. On error: log to stderr, return { ok: false, code }, show "Couldn't send. Email us: hello@..."
```

### 8.2 Email templates (`packages/email/src/templates/`)

React Email components rendered to HTML + plain-text fallback.

- `BookingLeadSales.tsx` — internal notification. Subject: `[Lead] {service} — {name} ({company})`. Body: structured fields + admin deep-link `/admin/collections/BookingLeads/{id}`.
- `BookingLeadVisitor.tsx` — auto-reply. Subject (locale-aware): "We received your request — Jakarta Business Center". Editorial tone; "1 business day reply"; partner contact.
- `ContactSales.tsx` / `ContactVisitor.tsx` — same pattern, simpler fields.

### 8.3 Email provider abstraction

```ts
// packages/email/src/send.ts
export async function sendEmail<T extends keyof Templates>(args: {
  template: T
  to: string
  data: Templates[T]
  locale: 'en' | 'id'
}): Promise<{ ok: true } | { ok: false; error: string }>
```

Provider chosen by `EMAIL_PROVIDER` env: `resend` (default) or `smtp` (nodemailer). Transparent to caller.

### 8.4 Anti-spam stack

- Honeypot field `hp` hidden via CSS; non-empty = reject silently
- Cloudflare Turnstile (no cookie, fits §11 anti-AI/SaaS)
- IP + email combined rate-limit key (in-memory LRU v1)
- Basic user-agent / known-bot pattern reject

### 8.5 Sales workflow in admin

Payload list view for `BookingLeads`:
- Columns: createdAt, name, company, service, preferredWindows, status
- Filters: status, service, date range
- Detail view: full message + status select + internal notes + Payload built-in versioning for audit
- No CRM integration v1; `afterChange` hook to HubSpot/Pipedrive deferred

---

## 9. Performance, Testing, Observability

### 9.1 Performance budget (enforced in CI)

Per `design-system.md` §22:

| Metric | Budget |
|---|---|
| LCP | < 1.5s |
| INP | < 100ms |
| CLS | < 0.05 |
| Initial JS gzipped | < 100kb |
| Hero image (AVIF) | < 200kb |
| Total page weight p75 | < 800kb |

Tools: Lighthouse CI per PR; `next-bundle-analyzer` artifact; image audit script.

### 9.2 Testing matrix

| Layer | Tool | Coverage |
|---|---|---|
| Unit | Vitest + Testing Library | `packages/ui` components × state matrix, form validation, i18n helpers, email template rendering |
| Integration | Vitest + Payload test client | `/api/booking`, `/api/contact`, revalidation hook, Payload collection hooks |
| E2E | Playwright | Bilingual rendering, service detail, pricing, booking happy path, 404, lang toggle |
| Visual regression (optional) | Playwright screenshot diff | Hero, EditorialList, PricingTable, MobileMenu |
| A11y | `@axe-core/playwright` on e2e | Contrast AA, semantic HTML, focus visible |
| Type | `tsc --strict` via Turbo | Monorepo-wide |

CI gates: lint + typecheck + unit + integration required per PR. E2E + Lighthouse on `main`.

### 9.3 Observability (v1, lightweight)

- App errors → stderr → `docker logs jakartabc-web`
- Caddy access log → file mount, retain 14 days
- Payload admin shows DB state directly
- Uptime: UptimeRobot free ping every 5 min
- Phase later: Sentry self-host or Glitchtip; structured log aggregation

---

## 10. Security & Operations

### 10.1 Secrets

- `.env` on VPS, mode 0600, owner deploy
- `.env.example` in repo (key names only)
- `.gitignore` blocks `.env`
- `PAYLOAD_SECRET` rotation invalidates sessions (documented in runbook)
- Phase later: Doppler/Infisical if team >3 devs

### 10.2 Security baseline

| Concern | Mitigation |
|---|---|
| SQL injection | Payload ORM-mediated; no raw queries v1 |
| XSS | React auto-escape + DOMPurify on lexical → HTML render |
| CSRF | Server Actions native CSRF; API routes check Origin |
| Admin brute force | Payload `maxLoginAttempts` + lockout |
| Admin URL discovery | `/admin` default v1; IP allowlist via Caddy phase later |
| File upload abuse | Payload Media `mimeTypes` whitelist (image/* v1), max 5MB, stored in `/uploads` volume (no executable extensions) |
| Rate limit bypass | IP+email combined key; honeypot + Turnstile |
| Dependency CVE | Renovate bot weekly + `pnpm audit` in CI |
| TLS | Caddy auto Let's Encrypt + HSTS |
| Security headers | CSP, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy minimal (via Next.js `headers()`) |
| Admin session | HttpOnly + Secure + SameSite=Lax cookie (Payload default) |
| Backup | `pg_dump` nightly cron, retain 14 days. Phase later: offsite S3/B2 |

### 10.3 CSP draft

```
default-src 'self';
img-src     'self' data: blob: https://*.r2.dev https://*.amazonaws.com;
script-src  'self' 'unsafe-inline' https://challenges.cloudflare.com;
style-src   'self' 'unsafe-inline';
font-src    'self' data:;
connect-src 'self' https://challenges.cloudflare.com;
frame-src   https://challenges.cloudflare.com;
```

`'unsafe-inline'` script tolerated v1 for Next.js inline runtime; nonce-based CSP phase later.

### 10.4 Deploy runbook (target: `README.md`)

Provision VPS (Hetzner CX22 class or similar):
1. Ubuntu 24.04 LTS
2. Non-root user `deploy`, SSH key only, password auth disabled
3. UFW: allow 22 (or custom SSH port), 80, 443
4. Install Docker + docker-compose plugin
5. Clone repo to `/opt/jakartabc.com`
6. Copy `.env.example` → `.env`, fill secrets
7. `docker compose up -d`
8. Caddy auto-provisions TLS via Let's Encrypt
9. First-time Payload admin creation via `/admin` (only first signup becomes admin)

Deploy update:
```bash
ssh deploy@vps
cd /opt/jakartabc.com
git pull
docker compose pull && docker compose up -d --build web
```

Rollback: `git checkout <prev-sha> && docker compose up -d --build web`

Phase later: GitHub Actions deploy-on-main via SSH.

### 10.5 Backup

Host cron:
```
0 3 * * * pg_dump -h localhost -U jakartabc jakartabc | gzip > /backup/db-$(date +\%F).sql.gz
0 4 * * * find /backup -name 'db-*.sql.gz' -mtime +14 -delete
```

Restore: `gunzip < db-YYYY-MM-DD.sql.gz | psql -U jakartabc jakartabc`

---

## 11. Open Items (TBD, blocking decisions)

| Item | Owner | Blocks |
|---|---|---|
| Monogram glyph design | Brand/design | Phase 1 production launch |
| Editorial stock asset license + final ~15-photo selection | Content | Phase 1 end |
| Sales email recipient address + WhatsApp number | Ops | Phase 3 |
| Domain DNS + email DNS (SPF/DKIM/DMARC for Resend) | Ops | Phase 3 |
| Founder note copy + signature scan | Founder | Phase 1 About page final |
| Pricing numbers final per service | Ops + Legal | Phase 1 Pricing page final |
| 4 service detail copy (EN + ID) | Content | Phase 1/2 |
| Initial Insights articles (3–5 launch articles) | Content | Phase 2 |
| Regulations citation source list | Legal/Content | Phase 2 |
| Turnstile site key + secret | Ops | Phase 3 |
| Phase 4 auth strategy (shared Payload users vs separate) | Eng | Phase 4 |

---

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Lead form vs §19.5 scheduler deviates from design intent | Medium | Conscious tradeoff documented (§2.1). Revisit Phase 5 if lead-to-call conversion suffers. |
| Bilingual content doubles editorial effort | High | Translation workflow: content team owns EN, translator owns ID. Payload admin surfaces missing translations per field. |
| VPS single-point-of-failure | Medium | Daily backup + documented restore. Phase later: managed Postgres + multi-instance. |
| Payload + Next.js coupled scaling | Low (v1 traffic) | Local API in-process = no scaling concern until ~100k MAU. Re-evaluate at scale. |
| Self-host TLS auto-renew failure | Low | Caddy mature. Uptime monitor alerts on cert expiry. |
| Self-host email deliverability (SPF/DKIM/DMARC misconfig) | Medium | Resend handles DKIM; Ops responsible for DNS records. Pre-launch deliverability test. |
| Payload v3 breaking changes pre-stable | Low | Pin minor version; review changelog before upgrade. |

---

## 13. References

- `design-system.md` v0.2 (this repo) — brand, visual, UX system
- Payload v3 docs — https://payloadcms.com/docs
- next-intl docs — https://next-intl-docs.vercel.app/
- React Email — https://react.email/
- Caddy — https://caddyserver.com/docs/

---

## Changelog

- **0.1** (2026-05-18) — Initial spec after brainstorming session. Locks framework, CMS, deploy, i18n, scope, and 4-phase breakdown.
