# Phase 1 — Marketing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 7 bilingual marketing pages with the full `packages/ui` component inventory, hitting the design system's anti-AI/SaaS bar and the spec's performance budget.

**Architecture:** Next.js 15 App Router static pages under `[locale]/`; MDX for service details (Phase 2 migrates to CMS); locale JSON for shared copy; component library in `packages/ui` consumed by `apps/web`; Vitest per-state unit tests + Playwright bilingual e2e + `@axe-core/playwright` a11y.

**Tech Stack:** Next.js 15, React 19, next-intl 3, `@next/mdx`, Tailwind CSS, Vitest, Playwright, `@axe-core/playwright`, Lighthouse CI.

**Prerequisite:** Phase 0 complete (`docs/superpowers/plans/2026-05-18-phase0-foundation.md`). Tokens, base components (Button/Card/Input), next-intl, fonts, Payload mount already in place.

---

## File Structure (created / modified by this phase)

```
jakartabc.com/
├── docs/anti-ai-checklist.md                                    [create]
├── .github/PULL_REQUEST_TEMPLATE.md                             [create]
├── .github/workflows/lighthouse.yml                             [create]
├── apps/web/
│   ├── package.json                                             [modify: add @next/mdx, MDX deps, axe]
│   ├── next.config.ts                                           [modify: MDX plugin]
│   ├── content/services/pt-pma-setup.en.mdx                     [create]
│   ├── content/services/pt-pma-setup.id.mdx                     [create]
│   ├── content/services/sector-licensing.en.mdx                 [create]
│   ├── content/services/sector-licensing.id.mdx                 [create]
│   ├── content/services/tax-accounting.en.mdx                   [create]
│   ├── content/services/tax-accounting.id.mdx                   [create]
│   ├── content/services/investor-kitas.en.mdx                   [create]
│   ├── content/services/investor-kitas.id.mdx                   [create]
│   ├── content/services/index.ts                                [create: registry + loader]
│   ├── messages/en.json                                         [modify: full marketing copy]
│   ├── messages/id.json                                         [modify: full marketing copy]
│   ├── src/app/[locale]/layout.tsx                              [modify: NavBar + Footer wired]
│   ├── src/app/[locale]/page.tsx                                [modify: full Home]
│   ├── src/app/[locale]/services/page.tsx                       [create]
│   ├── src/app/[locale]/services/[slug]/page.tsx                [create]
│   ├── src/app/[locale]/pricing/page.tsx                        [create]
│   ├── src/app/[locale]/about/page.tsx                          [create]
│   ├── src/app/[locale]/insights/page.tsx                       [create]
│   ├── src/app/[locale]/contact/page.tsx                        [create]
│   ├── src/app/[locale]/not-found.tsx                           [modify: editorial 404]
│   ├── src/app/[locale]/error.tsx                               [modify: editorial 500]
│   ├── e2e/marketing.spec.ts                                    [create]
│   ├── e2e/a11y.spec.ts                                         [create]
│   ├── e2e/mobile-responsive.spec.ts                            [create]
│   └── lighthouserc.json                                        [create]
└── packages/ui/
    ├── package.json                                             [modify: add react-aria peer if needed]
    ├── src/index.ts                                             [modify: export new components]
    ├── src/components/Eyebrow.tsx                               [create]
    ├── src/components/Eyebrow.test.tsx                          [create]
    ├── src/components/DisplayHeading.tsx                        [create]
    ├── src/components/DisplayHeading.test.tsx                   [create]
    ├── src/components/RuleDivider.tsx                           [create]
    ├── src/components/RuleDivider.test.tsx                      [create]
    ├── src/components/NavBar.tsx                                [create]
    ├── src/components/NavBar.test.tsx                           [create]
    ├── src/components/MobileMenu.tsx                            [create]
    ├── src/components/MobileMenu.test.tsx                       [create]
    ├── src/components/FooterBlock.tsx                           [create]
    ├── src/components/FooterBlock.test.tsx                      [create]
    ├── src/components/Hero.tsx                                  [create]
    ├── src/components/Hero.test.tsx                             [create]
    ├── src/components/EditorialList.tsx                         [create]
    ├── src/components/EditorialList.test.tsx                    [create]
    ├── src/components/PricingTable.tsx                          [create]
    ├── src/components/PricingTable.test.tsx                     [create]
    ├── src/components/EditorialTimeline.tsx                     [create]
    ├── src/components/EditorialTimeline.test.tsx                [create]
    ├── src/components/EditorialQuote.tsx                        [create]
    ├── src/components/EditorialQuote.test.tsx                   [create]
    ├── src/components/StickyTOC.tsx                             [create]
    ├── src/components/StickyTOC.test.tsx                        [create]
    ├── src/components/InsightCard.tsx                           [create]
    ├── src/components/InsightCard.test.tsx                      [create]
    ├── src/components/ContactBlock.tsx                          [create]
    ├── src/components/ContactBlock.test.tsx                     [create]
    ├── src/components/BookingForm.tsx                           [create: visual stub]
    ├── src/components/BookingForm.test.tsx                      [create]
    ├── src/components/ContactForm.tsx                           [create: visual stub]
    ├── src/components/ContactForm.test.tsx                      [create]
    ├── src/components/LangToggle.tsx                            [create]
    ├── src/components/LangToggle.test.tsx                       [create]
    └── src/components/LocalizedLink.tsx                         [create]
```

---

## Task Sequence

1. MDX setup in `apps/web` + content registry
2. Typographic primitives: Eyebrow, DisplayHeading, RuleDivider
3. NavBar
4. MobileMenu
5. FooterBlock (light + dark variants)
6. layout.tsx wires NavBar + FooterBlock
7. LocalizedLink + LangToggle
8. Hero
9. EditorialList
10. PricingTable
11. EditorialTimeline
12. EditorialQuote
13. StickyTOC (scroll-spy)
14. InsightCard
15. ContactBlock
16. BookingForm visual stub
17. ContactForm visual stub
18. Home page `/`
19. Services overview `/services`
20. Service detail `/services/[slug]` + MDX loader
21. MDX content × 4 services × 2 locales
22. Pricing page `/pricing`
23. About page `/about`
24. Insights list `/insights` empty state
25. Contact page `/contact`
26. Refine not-found.tsx + error.tsx
27. Bilingual messages JSON complete
28. State matrix Vitest sweep
29. A11y e2e (axe + bilingual)
30. Mobile-responsive e2e
31. Lighthouse CI budgets
32. Anti-AI checklist doc + PR template
33. Final commit + tag `phase-1-marketing-complete`

---

## Conventions used in every task

- **TDD:** write failing test, run to see fail, implement, run to see pass, commit.
- **Vitest runner:** `pnpm --filter @jakartabc/ui test <pattern>` for component tests; `pnpm --filter @jakartabc/web test` for app tests.
- **Playwright runner:** `pnpm --filter @jakartabc/web e2e <file>`.
- **Conventional commit footer** (use HEREDOC):
  ```bash
  git commit -m "$(cat <<'EOF'
  feat(ui): <subject under 60 chars>

  <optional body>

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```
- **State matrix (DS §20):** every interactive component implements + tests default, hover, focus, active, disabled, loading, error (where applicable).
- **`cn()` helper** from `packages/ui/src/lib/cn.ts` (Phase 0) for class composition.
- **i18n in components:** components stay i18n-agnostic — accept text via props/children. Page-level pulls strings from `useTranslations()` (next-intl).

---

### Task 1: MDX setup + service content registry

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.ts`
- Create: `apps/web/content/services/index.ts`
- Create: `apps/web/src/lib/mdx.ts`
- Test: `apps/web/src/lib/mdx.test.ts`

- [ ] **Step 1: Install MDX deps**

```bash
pnpm --filter @jakartabc/web add @next/mdx @mdx-js/loader @mdx-js/react gray-matter
pnpm --filter @jakartabc/web add -D @types/mdx
```

- [ ] **Step 2: Write failing test for MDX loader**

```ts
// apps/web/src/lib/mdx.test.ts
import { describe, it, expect } from 'vitest'
import { loadServiceMdx, listServiceSlugs } from './mdx'

describe('service MDX loader', () => {
  it('lists all service slugs', () => {
    const slugs = listServiceSlugs()
    expect(slugs).toEqual(
      expect.arrayContaining(['pt-pma-setup', 'sector-licensing', 'tax-accounting', 'investor-kitas'])
    )
  })

  it('loads EN content with frontmatter', async () => {
    const { frontmatter } = await loadServiceMdx('pt-pma-setup', 'en')
    expect(frontmatter.title).toBeTruthy()
    expect(frontmatter.timelineLabel).toBeTruthy()
  })

  it('loads ID content with frontmatter', async () => {
    const { frontmatter } = await loadServiceMdx('pt-pma-setup', 'id')
    expect(frontmatter.title).toBeTruthy()
  })

  it('throws on unknown slug', async () => {
    await expect(loadServiceMdx('nope', 'en')).rejects.toThrow()
  })
})
```

Run: `pnpm --filter @jakartabc/web test mdx`
Expected: FAIL (loader not implemented + no MDX content yet — both expected at this step)

- [ ] **Step 3: Implement loader + registry**

```ts
// apps/web/content/services/index.ts
export const SERVICE_SLUGS = ['pt-pma-setup', 'sector-licensing', 'tax-accounting', 'investor-kitas'] as const
export type ServiceSlug = (typeof SERVICE_SLUGS)[number]
```

```ts
// apps/web/src/lib/mdx.ts
import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { SERVICE_SLUGS, type ServiceSlug } from '../../content/services'

const ROOT = path.join(process.cwd(), 'content/services')

export function listServiceSlugs(): readonly ServiceSlug[] {
  return SERVICE_SLUGS
}

export type ServiceFrontmatter = {
  title: string
  timelineLabel: string
  leadParagraph: string
  pricing?: { govFee: number; ourFee: number; currency: string }
}

export type LoadedMdx = {
  frontmatter: ServiceFrontmatter
  content: string
}

export async function loadServiceMdx(slug: string, locale: 'en' | 'id'): Promise<LoadedMdx> {
  if (!(SERVICE_SLUGS as readonly string[]).includes(slug)) {
    throw new Error(`unknown service slug: ${slug}`)
  }
  const file = await fs.readFile(path.join(ROOT, `${slug}.${locale}.mdx`), 'utf8')
  const parsed = matter(file)
  return { frontmatter: parsed.data as ServiceFrontmatter, content: parsed.content }
}
```

- [ ] **Step 4: Stub MDX files so loader works**

Create stubs (full content added in Task 21):

```mdx
<!-- apps/web/content/services/pt-pma-setup.en.mdx -->
---
title: PT PMA Setup
timelineLabel: 4–6 wks
leadParagraph: Foreign-owned company registration, end to end.
pricing:
  govFee: 2500000
  ourFee: 18000000
  currency: IDR
---

# PT PMA Setup

Stub content.
```

Repeat with same shape for: `pt-pma-setup.id.mdx`, `sector-licensing.{en,id}.mdx`, `tax-accounting.{en,id}.mdx`, `investor-kitas.{en,id}.mdx`. ID stubs use ID title (e.g., "Pendirian PT PMA"). Stubs are temporary; Task 21 replaces with real copy.

- [ ] **Step 5: Configure next.config for MDX**

```ts
// apps/web/next.config.ts
import createMDX from '@next/mdx'
import withNextIntl from 'next-intl/plugin'

const withMDX = createMDX({})
const withIntl = withNextIntl('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  images: { formats: ['image/avif', 'image/webp'] },
}

export default withMDX(withIntl(nextConfig))
```

- [ ] **Step 6: Run test to pass**

Run: `pnpm --filter @jakartabc/web test mdx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/next.config.ts apps/web/content apps/web/src/lib/mdx.ts apps/web/src/lib/mdx.test.ts
git commit -m "$(cat <<'EOF'
feat(web): wire MDX loader + service content registry

Adds @next/mdx + gray-matter for frontmatter parsing. Service detail pages
will read bilingual MDX from apps/web/content/services/{slug}.{locale}.mdx.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Eyebrow + DisplayHeading + RuleDivider primitives

**Files:**
- Create: `packages/ui/src/components/Eyebrow.tsx`
- Create: `packages/ui/src/components/Eyebrow.test.tsx`
- Create: `packages/ui/src/components/DisplayHeading.tsx`
- Create: `packages/ui/src/components/DisplayHeading.test.tsx`
- Create: `packages/ui/src/components/RuleDivider.tsx`
- Create: `packages/ui/src/components/RuleDivider.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing tests**

```tsx
// packages/ui/src/components/Eyebrow.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Eyebrow } from './Eyebrow'

describe('Eyebrow', () => {
  it('renders uppercase tracked text', () => {
    render(<Eyebrow>foreign direct investment</Eyebrow>)
    const el = screen.getByText(/foreign direct investment/i)
    expect(el).toHaveClass('uppercase')
    expect(el.className).toMatch(/tracking-/)
  })

  it('forwards className', () => {
    render(<Eyebrow className="ml-2">x</Eyebrow>)
    expect(screen.getByText('x')).toHaveClass('ml-2')
  })
})
```

```tsx
// packages/ui/src/components/DisplayHeading.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DisplayHeading } from './DisplayHeading'

describe('DisplayHeading', () => {
  it('renders semantic level (h1 by default, customizable)', () => {
    const { rerender } = render(<DisplayHeading>Hello</DisplayHeading>)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    rerender(<DisplayHeading as="h2">Hello</DisplayHeading>)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('applies size variants (xl/lg/md)', () => {
    const { rerender } = render(<DisplayHeading size="xl">x</DisplayHeading>)
    expect(screen.getByRole('heading')).toHaveClass('text-display-xl')
    rerender(<DisplayHeading size="md">x</DisplayHeading>)
    expect(screen.getByRole('heading')).toHaveClass('text-display-md')
  })

  it('uses display serif font', () => {
    render(<DisplayHeading>x</DisplayHeading>)
    expect(screen.getByRole('heading')).toHaveClass('font-display')
  })
})
```

```tsx
// packages/ui/src/components/RuleDivider.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RuleDivider } from './RuleDivider'

describe('RuleDivider', () => {
  it('renders an hr with soft rule color', () => {
    const { container } = render(<RuleDivider />)
    const hr = container.querySelector('hr')
    expect(hr).not.toBeNull()
    expect(hr).toHaveClass('border-t')
  })

  it('supports firm weight', () => {
    const { container } = render(<RuleDivider weight="firm" />)
    expect(container.querySelector('hr')).toHaveClass('border-ink-900/15')
  })
})
```

Run: `pnpm --filter @jakartabc/ui test Eyebrow DisplayHeading RuleDivider`
Expected: FAIL (components not implemented)

- [ ] **Step 2: Implement Eyebrow**

```tsx
// packages/ui/src/components/Eyebrow.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

export type EyebrowProps = React.HTMLAttributes<HTMLSpanElement>

export function Eyebrow({ className, children, ...rest }: EyebrowProps) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-block font-body text-eyebrow font-medium uppercase tracking-[0.08em] text-ink-700',
        className,
      )}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 3: Implement DisplayHeading**

```tsx
// packages/ui/src/components/DisplayHeading.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

type Level = 'h1' | 'h2' | 'h3' | 'h4'
type Size = 'xl' | 'lg' | 'md'

const sizeClass: Record<Size, string> = {
  xl: 'text-display-xl leading-[1.05]',
  lg: 'text-display-lg leading-[1.1]',
  md: 'text-display-md leading-[1.15]',
}

export type DisplayHeadingProps = {
  as?: Level
  size?: Size
  className?: string
  children: React.ReactNode
}

export function DisplayHeading({ as: Tag = 'h1', size = 'xl', className, children }: DisplayHeadingProps) {
  return (
    <Tag
      className={cn(
        'font-display font-normal text-balance text-ink-900',
        sizeClass[size],
        className,
      )}
    >
      {children}
    </Tag>
  )
}
```

- [ ] **Step 4: Implement RuleDivider**

```tsx
// packages/ui/src/components/RuleDivider.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

export type RuleDividerProps = {
  weight?: 'soft' | 'firm'
  className?: string
}

export function RuleDivider({ weight = 'soft', className }: RuleDividerProps) {
  return (
    <hr
      role="separator"
      className={cn(
        'border-t border-0',
        weight === 'soft' ? 'border-ink-900/[0.08]' : 'border-ink-900/15',
        className,
      )}
    />
  )
}
```

- [ ] **Step 5: Export**

```ts
// packages/ui/src/index.ts (append)
export * from './components/Eyebrow'
export * from './components/DisplayHeading'
export * from './components/RuleDivider'
```

- [ ] **Step 6: Run tests pass**

Run: `pnpm --filter @jakartabc/ui test Eyebrow DisplayHeading RuleDivider`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/{Eyebrow,DisplayHeading,RuleDivider}.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): add Eyebrow, DisplayHeading, RuleDivider typographic primitives

Editorial label, serif display headings, and hairline rule divider per
design system §5 and §11. Foundations for Hero, EditorialList, and section
breaks across marketing pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: NavBar

**Files:**
- Create: `packages/ui/src/components/NavBar.tsx`
- Create: `packages/ui/src/components/NavBar.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing tests**

```tsx
// packages/ui/src/components/NavBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NavBar } from './NavBar'

const items = [
  { label: 'Services', href: '/services' },
  { label: 'Insights', href: '/insights' },
  { label: 'About', href: '/about' },
]

describe('NavBar', () => {
  it('renders logo wordmark and items', () => {
    render(<NavBar brand="jakartabc" items={items} cta={{ label: 'Book', href: '/contact' }} locale="en" onLocaleChange={() => {}} />)
    expect(screen.getByText('jakartabc')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/services')
  })

  it('renders CTA button', () => {
    render(<NavBar brand="jakartabc" items={items} cta={{ label: 'Book a call', href: '/contact' }} locale="en" onLocaleChange={() => {}} />)
    expect(screen.getByRole('link', { name: /book a call/i })).toBeInTheDocument()
  })

  it('renders locale toggle and calls handler', () => {
    const handler = vi.fn()
    render(<NavBar brand="jakartabc" items={items} cta={{ label: 'x', href: '/c' }} locale="en" onLocaleChange={handler} />)
    fireEvent.click(screen.getByRole('button', { name: /switch to indonesian/i }))
    expect(handler).toHaveBeenCalledWith('id')
  })

  it('opens mobile menu via menu button (mobile breakpoint)', () => {
    const handler = vi.fn()
    render(<NavBar brand="jakartabc" items={items} cta={{ label: 'x', href: '/c' }} locale="en" onLocaleChange={() => {}} onMobileOpen={handler} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    expect(handler).toHaveBeenCalled()
  })
})
```

Run: `pnpm --filter @jakartabc/ui test NavBar`
Expected: FAIL

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/NavBar.tsx
'use client'
import * as React from 'react'
import { cn } from '../lib/cn'
import { Button } from './Button'

export type NavItem = { label: string; href: string }

export type NavBarProps = {
  brand: string
  items: NavItem[]
  cta: { label: string; href: string }
  locale: 'en' | 'id'
  onLocaleChange: (next: 'en' | 'id') => void
  onMobileOpen?: () => void
  className?: string
  Link?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>
}

function DefaultLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className}>{children}</a>
}

export function NavBar({ brand, items, cta, locale, onLocaleChange, onMobileOpen, className, Link = DefaultLink }: NavBarProps) {
  const [scrolled, setScrolled] = React.useState(false)
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const next: 'en' | 'id' = locale === 'en' ? 'id' : 'en'
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sticky top-0 z-50 bg-bone-50',
        scrolled ? 'border-b border-ink-900/[0.08]' : 'border-b border-transparent',
        'transition-colors duration-150',
        className,
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-container items-center justify-between gap-8 px-6 md:px-10">
        <Link href={`/${locale === 'en' ? '' : 'id'}`} className="font-display text-2xl text-ink-900">
          {brand}
        </Link>

        <ul className="hidden gap-8 md:flex">
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className="text-body-md text-ink-900 underline-offset-4 hover:text-ochre-700 hover:underline">
                {it.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 md:flex">
          <button
            type="button"
            onClick={() => onLocaleChange(next)}
            aria-label={`Switch to ${next === 'id' ? 'Indonesian' : 'English'}`}
            className="text-eyebrow uppercase tracking-[0.08em] text-ink-700 hover:text-ink-900"
          >
            EN · ID
          </button>
          <Button asChild variant="primary" size="sm">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label="Open menu"
          onClick={onMobileOpen}
          className="md:hidden text-ink-900"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
```

Note: The `Link` injection prop lets `apps/web` pass `LocalizedLink` (next-intl) without `packages/ui` depending on Next.js.

- [ ] **Step 3: Run tests pass**

```bash
pnpm --filter @jakartabc/ui test NavBar
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/NavBar.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): NavBar with sticky scroll, locale toggle, mobile trigger

Sticky 72px nav per design system §7.4 + §18.1. Light scroll-aware border.
Link component is injectable so apps can pass locale-aware Link without
coupling packages/ui to Next.js.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: MobileMenu

**Files:**
- Create: `packages/ui/src/components/MobileMenu.tsx`
- Create: `packages/ui/src/components/MobileMenu.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing tests**

```tsx
// packages/ui/src/components/MobileMenu.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MobileMenu } from './MobileMenu'

const items = [{ label: 'Services', href: '/services' }, { label: 'About', href: '/about' }]

describe('MobileMenu', () => {
  it('renders nothing when closed', () => {
    render(<MobileMenu open={false} onClose={() => {}} brand="jakartabc" items={items} cta={{ label: 'Book', href: '/c' }} locale="en" onLocaleChange={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders full-screen dialog when open', () => {
    render(<MobileMenu open onClose={() => {}} brand="jakartabc" items={items} cta={{ label: 'Book', href: '/c' }} locale="en" onLocaleChange={() => {}} />)
    expect(screen.getByRole('dialog', { name: /menu/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Services' })).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const close = vi.fn()
    render(<MobileMenu open onClose={close} brand="jakartabc" items={items} cta={{ label: 'Book', href: '/c' }} locale="en" onLocaleChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(close).toHaveBeenCalled()
  })

  it('toggles locale via button', () => {
    const onLocale = vi.fn()
    render(<MobileMenu open onClose={() => {}} brand="jakartabc" items={items} cta={{ label: 'x', href: '/c' }} locale="en" onLocaleChange={onLocale} />)
    fireEvent.click(screen.getByRole('button', { name: /switch to indonesian/i }))
    expect(onLocale).toHaveBeenCalledWith('id')
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/MobileMenu.tsx
'use client'
import * as React from 'react'
import { cn } from '../lib/cn'
import { Button } from './Button'

export type MobileMenuProps = {
  open: boolean
  onClose: () => void
  brand: string
  items: { label: string; href: string }[]
  cta: { label: string; href: string }
  locale: 'en' | 'id'
  onLocaleChange: (next: 'en' | 'id') => void
  Link?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>
}

function DefaultLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className}>{children}</a>
}

export function MobileMenu({ open, onClose, brand, items, cta, locale, onLocaleChange, Link = DefaultLink }: MobileMenuProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const next: 'en' | 'id' = locale === 'en' ? 'id' : 'en'
  return (
    <div role="dialog" aria-modal="true" aria-label="Menu" className={cn('fixed inset-0 z-[100] bg-bone-50')}>
      <div className="flex h-[64px] items-center justify-between px-6">
        <span className="font-display text-2xl text-ink-900">{brand}</span>
        <button type="button" onClick={onClose} aria-label="Close menu" className="text-ink-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>
      <ul className="flex flex-col gap-2 px-6 pt-12">
        {items.map((it) => (
          <li key={it.href} className="border-b border-ink-900/[0.08] py-4">
            <Link href={it.href} className="font-display text-display-md text-ink-900">{it.label}</Link>
          </li>
        ))}
      </ul>
      <div className="px-6 pt-12">
        <button
          type="button"
          onClick={() => onLocaleChange(next)}
          aria-label={`Switch to ${next === 'id' ? 'Indonesian' : 'English'}`}
          className="text-eyebrow uppercase tracking-[0.08em] text-ink-700"
        >
          EN · ID
        </button>
      </div>
      <div className="px-6 pt-8">
        <Button asChild variant="primary" size="md" className="w-full">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Tests pass**

```bash
pnpm --filter @jakartabc/ui test MobileMenu
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/MobileMenu.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): MobileMenu full-screen takeover with Escape + scroll lock

DS §18.5 mobile nav. display-md typography per item, hairline dividers,
locale toggle, primary CTA. Locks body scroll while open; Escape closes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: FooterBlock (light + dark variants)

**Files:**
- Create: `packages/ui/src/components/FooterBlock.tsx`
- Create: `packages/ui/src/components/FooterBlock.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing tests**

```tsx
// packages/ui/src/components/FooterBlock.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FooterBlock } from './FooterBlock'

const props = {
  brand: 'jakartabc',
  address: ['Sudirman, Jakarta 12190', 'Indonesia'],
  email: 'hello@jakartabc.com',
  licenses: ['SIUP 001/2025', 'BKPM Licensed'],
  legalLinks: [{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }],
}

describe('FooterBlock', () => {
  it('renders brand, address, email, licenses', () => {
    render(<FooterBlock {...props} />)
    expect(screen.getByText('jakartabc')).toBeInTheDocument()
    expect(screen.getByText('Sudirman, Jakarta 12190')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /hello@jakartabc.com/i })).toBeInTheDocument()
    expect(screen.getByText('SIUP 001/2025')).toBeInTheDocument()
  })

  it('applies dark variant', () => {
    const { container } = render(<FooterBlock {...props} variant="dark" />)
    expect(container.firstChild).toHaveClass('bg-ink-900')
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/FooterBlock.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

export type FooterBlockProps = {
  brand: string
  address: string[]
  email: string
  licenses: string[]
  legalLinks?: { label: string; href: string }[]
  variant?: 'light' | 'dark'
  className?: string
  Link?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>
}

function DefaultLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className}>{children}</a>
}

export function FooterBlock({ brand, address, email, licenses, legalLinks = [], variant = 'light', className, Link = DefaultLink }: FooterBlockProps) {
  const dark = variant === 'dark'
  return (
    <footer
      className={cn(
        'mt-32 border-t',
        dark ? 'bg-ink-900 text-bone-100 border-bone-100/10' : 'bg-bone-50 text-ink-900 border-ink-900/[0.08]',
        className,
      )}
    >
      <div className="mx-auto grid max-w-container grid-cols-1 gap-12 px-6 py-24 md:grid-cols-4 md:px-10">
        <div>
          <span className={cn('font-display text-2xl', dark ? 'text-bone-100' : 'text-ink-900')}>{brand}</span>
        </div>
        <div>
          <p className="mb-3 text-eyebrow uppercase tracking-[0.08em] opacity-70">Office</p>
          <address className="not-italic text-body-md leading-relaxed">
            {address.map((line) => <div key={line}>{line}</div>)}
          </address>
        </div>
        <div>
          <p className="mb-3 text-eyebrow uppercase tracking-[0.08em] opacity-70">Contact</p>
          <a href={`mailto:${email}`} className="text-body-md underline-offset-4 hover:underline">{email}</a>
        </div>
        <div>
          <p className="mb-3 text-eyebrow uppercase tracking-[0.08em] opacity-70">Licenses</p>
          <ul className="space-y-1 text-body-sm">
            {licenses.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </div>
      {legalLinks.length > 0 && (
        <div className={cn('mx-auto flex max-w-container items-center justify-between px-6 py-6 text-body-sm md:px-10', dark ? 'border-t border-bone-100/10' : 'border-t border-ink-900/[0.08]')}>
          <span className="opacity-70">© {new Date().getFullYear()} {brand}</span>
          <ul className="flex gap-6">
            {legalLinks.map((l) => (
              <li key={l.href}><Link href={l.href} className="underline-offset-4 hover:underline">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </footer>
  )
}
```

- [ ] **Step 3: Tests pass**

```bash
pnpm --filter @jakartabc/ui test FooterBlock
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/FooterBlock.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): FooterBlock with light + dark variants

DS §12 footer + §24 selective dark. Address/email/licenses honestly
displayed, legal links subline. Dark variant grounds About + featured
insight pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Wire layout.tsx with NavBar + FooterBlock

**Files:**
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Modify: `apps/web/messages/en.json` (add `nav.*` keys + `footer.*` keys)
- Modify: `apps/web/messages/id.json` (same keys)
- Test: `apps/web/e2e/marketing.spec.ts` (smoke that NavBar + Footer render)

- [ ] **Step 1: Append message keys**

```json
// apps/web/messages/en.json — merge under existing root
{
  "nav": {
    "services": "Services",
    "insights": "Insights",
    "about": "About",
    "pricing": "Pricing",
    "cta": "Book a call"
  },
  "footer": {
    "address": ["Sudirman Central Business District", "Jakarta 12190, Indonesia"],
    "email": "hello@jakartabc.com",
    "licenses": ["BKPM Licensed Consultant", "PT PMA Registered: 001/2025"]
  }
}
```

```json
// apps/web/messages/id.json — same keys, ID copy
{
  "nav": {
    "services": "Layanan",
    "insights": "Insight",
    "about": "Tentang",
    "pricing": "Harga",
    "cta": "Jadwalkan konsultasi"
  },
  "footer": {
    "address": ["Sudirman Central Business District", "Jakarta 12190, Indonesia"],
    "email": "hello@jakartabc.com",
    "licenses": ["Konsultan Berlisensi BKPM", "PT PMA Terdaftar: 001/2025"]
  }
}
```

- [ ] **Step 2: Implement layout wiring**

```tsx
// apps/web/src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { LocalizedLayoutChrome } from '@/components/LocalizedLayoutChrome'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as 'en' | 'id')) notFound()
  setRequestLocale(locale)
  const messages = await getMessages()
  const t = await getTranslations('nav')
  const tf = await getTranslations('footer')

  return (
    <NextIntlClientProvider messages={messages}>
      <LocalizedLayoutChrome
        locale={locale as 'en' | 'id'}
        nav={{
          services: t('services'),
          insights: t('insights'),
          about: t('about'),
          pricing: t('pricing'),
          cta: t('cta'),
        }}
        footer={{
          address: tf.raw('address') as string[],
          email: tf('email'),
          licenses: tf.raw('licenses') as string[],
        }}
      >
        {children}
      </LocalizedLayoutChrome>
    </NextIntlClientProvider>
  )
}
```

```tsx
// apps/web/src/components/LocalizedLayoutChrome.tsx
'use client'
import * as React from 'react'
import { NavBar, MobileMenu, FooterBlock } from '@jakartabc/ui'
import { useRouter, usePathname } from '@/i18n/routing'
import { LocalizedLink } from './LocalizedLink'

type NavCopy = { services: string; insights: string; about: string; pricing: string; cta: string }
type FooterCopy = { address: string[]; email: string; licenses: string[] }

export function LocalizedLayoutChrome({
  locale, nav, footer, children,
}: { locale: 'en' | 'id'; nav: NavCopy; footer: FooterCopy; children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)

  const items = [
    { label: nav.services, href: '/services' },
    { label: nav.insights, href: '/insights' },
    { label: nav.pricing, href: '/pricing' },
    { label: nav.about, href: '/about' },
  ]

  const onLocaleChange = (next: 'en' | 'id') => router.replace(pathname, { locale: next })

  return (
    <>
      <NavBar
        brand="jakartabc"
        items={items}
        cta={{ label: nav.cta, href: '/contact' }}
        locale={locale}
        onLocaleChange={onLocaleChange}
        onMobileOpen={() => setMenuOpen(true)}
        Link={LocalizedLink}
      />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        brand="jakartabc"
        items={items}
        cta={{ label: nav.cta, href: '/contact' }}
        locale={locale}
        onLocaleChange={(next) => { setMenuOpen(false); onLocaleChange(next) }}
        Link={LocalizedLink}
      />
      <main>{children}</main>
      <FooterBlock
        brand="jakartabc"
        address={footer.address}
        email={footer.email}
        licenses={footer.licenses}
        legalLinks={[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }]}
        Link={LocalizedLink}
      />
    </>
  )
}
```

- [ ] **Step 3: Smoke e2e**

```ts
// apps/web/e2e/marketing.spec.ts
import { test, expect } from '@playwright/test'

for (const locale of ['en', 'id'] as const) {
  test(`renders nav and footer at ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/' : '/id')
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
    await expect(page.locator('text=jakartabc').first()).toBeVisible()
  })
}
```

- [ ] **Step 4: Run e2e pass**

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/layout.tsx apps/web/src/components/LocalizedLayoutChrome.tsx apps/web/messages/en.json apps/web/messages/id.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): wire NavBar + FooterBlock into bilingual layout

LocalizedLayoutChrome bridges next-intl router with packages/ui chrome.
Lang toggle preserves the current path. Mobile menu hooked up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: LocalizedLink + LangToggle

**Files:**
- Create: `apps/web/src/components/LocalizedLink.tsx`
- Create: `packages/ui/src/components/LangToggle.tsx`
- Create: `packages/ui/src/components/LangToggle.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: LocalizedLink in app**

```tsx
// apps/web/src/components/LocalizedLink.tsx
import { Link } from '@/i18n/routing'
import * as React from 'react'

export function LocalizedLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <Link href={href as any} className={className}>{children}</Link>
}
```

- [ ] **Step 2: LangToggle test**

```tsx
// packages/ui/src/components/LangToggle.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LangToggle } from './LangToggle'

describe('LangToggle', () => {
  it('renders "EN · ID" with current locale highlighted', () => {
    render(<LangToggle current="en" onChange={() => {}} />)
    expect(screen.getByText('EN')).toHaveClass('text-ink-900')
    expect(screen.getByText('ID')).toHaveClass('text-ink-500')
  })
  it('calls onChange with opposite locale on click', () => {
    const onChange = vi.fn()
    render(<LangToggle current="en" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith('id')
  })
})
```

- [ ] **Step 3: Implement LangToggle**

```tsx
// packages/ui/src/components/LangToggle.tsx
'use client'
import { cn } from '../lib/cn'

export type LangToggleProps = { current: 'en' | 'id'; onChange: (next: 'en' | 'id') => void; className?: string }

export function LangToggle({ current, onChange, className }: LangToggleProps) {
  const next = current === 'en' ? 'id' : 'en'
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`Switch to ${next === 'id' ? 'Indonesian' : 'English'}`}
      className={cn('text-eyebrow uppercase tracking-[0.08em]', className)}
    >
      <span className={current === 'en' ? 'text-ink-900' : 'text-ink-500'}>EN</span>
      <span className="mx-1 text-ink-500" aria-hidden> · </span>
      <span className={current === 'id' ? 'text-ink-900' : 'text-ink-500'}>ID</span>
    </button>
  )
}
```

- [ ] **Step 4: Tests pass + export + commit**

```bash
pnpm --filter @jakartabc/ui test LangToggle
git add packages/ui/src/components/LangToggle.{tsx,test.tsx} packages/ui/src/index.ts apps/web/src/components/LocalizedLink.tsx
git commit -m "$(cat <<'EOF'
feat(ui): LangToggle + LocalizedLink wrapper

Standalone eyebrow-style EN · ID toggle. App-level LocalizedLink wraps
next-intl Link so packages/ui stays framework-agnostic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Hero

**Files:**
- Create: `packages/ui/src/components/Hero.tsx`
- Create: `packages/ui/src/components/Hero.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/Hero.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Hero } from './Hero'

describe('Hero', () => {
  it('renders eyebrow + headline + lead + primary CTA + secondary link', () => {
    render(
      <Hero
        eyebrow="FOREIGN DIRECT INVESTMENT · INDONESIA"
        headline="Set up a PT PMA in Indonesia."
        lead="Foreign-owned company registration handled by a Jakarta team."
        primary={{ label: 'Book a call', href: '/contact' }}
        secondary={{ label: 'See how it works', href: '/services' }}
      />
    )
    expect(screen.getByText(/foreign direct investment/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Set up a PT PMA/)
    expect(screen.getByText(/Jakarta team/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Book a call' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See how it works' })).toBeInTheDocument()
  })

  it('has no background image (per DS §7.5)', () => {
    const { container } = render(
      <Hero eyebrow="x" headline="y" lead="z" primary={{ label: 'a', href: '/' }} />
    )
    expect(container.querySelector('[style*="background-image"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/Hero.tsx
import * as React from 'react'
import { cn } from '../lib/cn'
import { Button } from './Button'
import { DisplayHeading } from './DisplayHeading'
import { Eyebrow } from './Eyebrow'

export type HeroProps = {
  eyebrow: string
  headline: React.ReactNode
  lead: React.ReactNode
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
  className?: string
  Link?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>
}

function DefaultLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className}>{children}</a>
}

export function Hero({ eyebrow, headline, lead, primary, secondary, className, Link = DefaultLink }: HeroProps) {
  return (
    <section className={cn('px-6 py-32 md:px-10 md:py-40', className)}>
      <div className="mx-auto max-w-editorial">
        <Eyebrow>{eyebrow}</Eyebrow>
        <DisplayHeading as="h1" size="xl" className="mt-6">{headline}</DisplayHeading>
        <p className="mt-8 max-w-prose text-body-lg leading-relaxed text-ink-700">{lead}</p>
        <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
          <Button asChild variant="primary" size="lg">
            <Link href={primary.href}>{primary.label} →</Link>
          </Button>
          {secondary && (
            <Button asChild variant="ghost" size="lg">
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test Hero
git add packages/ui/src/components/Hero.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): Hero section per DS §7.5 + §18.1

Eyebrow + serif display headline + lead + primary CTA + optional ghost
secondary. No background image, no gradient, no carousel — quiet editorial.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: EditorialList

**Files:**
- Create: `packages/ui/src/components/EditorialList.tsx`
- Create: `packages/ui/src/components/EditorialList.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/EditorialList.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EditorialList } from './EditorialList'

const items = [
  { slug: 'pt-pma-setup', title: 'PT PMA Setup', desc: 'Foreign-owned LLC registration, end to end.', timeline: '4–6 wks' },
  { slug: 'sector-licensing', title: 'Sector Licensing', desc: 'OSS, KBLI, sector-specific permits.', timeline: '2–8 wks' },
]

describe('EditorialList', () => {
  it('renders each item with index, title, desc, timeline, read link', () => {
    render(<EditorialList items={items} hrefPrefix="/services" readLabel="Read" />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PT PMA Setup' })).toBeInTheDocument()
    expect(screen.getByText(/Foreign-owned LLC/)).toBeInTheDocument()
    expect(screen.getByText('4–6 wks')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /read.*PT PMA Setup/i })).toHaveAttribute('href', '/services/pt-pma-setup')
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/EditorialList.tsx
import * as React from 'react'
import { cn } from '../lib/cn'
import { RuleDivider } from './RuleDivider'

export type EditorialListItem = { slug: string; title: string; desc: string; timeline: string }

export type EditorialListProps = {
  items: EditorialListItem[]
  hrefPrefix: string
  readLabel: string
  className?: string
  Link?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>
}

function DefaultLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className}>{children}</a>
}

export function EditorialList({ items, hrefPrefix, readLabel, className, Link = DefaultLink }: EditorialListProps) {
  return (
    <ol className={cn('mx-auto max-w-container px-6 md:px-10', className)}>
      {items.map((it, i) => (
        <li key={it.slug} className="py-12">
          <div className="grid grid-cols-1 items-baseline gap-y-4 md:grid-cols-[80px_1fr_auto]">
            <span className="font-mono text-mono-sm tabular-nums text-ink-500">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3 className="font-display text-display-md text-ink-900">{it.title}</h3>
              <p className="mt-3 max-w-prose text-body-md text-ink-700">{it.desc}</p>
            </div>
            <span className="font-mono text-mono-sm tabular-nums text-ink-500">{it.timeline}</span>
          </div>
          <div className="mt-6 flex justify-end">
            <Link
              href={`${hrefPrefix}/${it.slug}`}
              className="text-body-md text-ochre-700 underline-offset-4 hover:underline"
              aria-label={`${readLabel}: ${it.title}`}
            >
              {readLabel} →
            </Link>
          </div>
          {i < items.length - 1 && <div className="mt-12"><RuleDivider /></div>}
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test EditorialList
git add packages/ui/src/components/EditorialList.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): EditorialList for service overview (DS §18.2)

Numbered editorial list w/ rule dividers + timeline labels + Read →
links. Replaces card-grid pattern with table-of-contents feel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: PricingTable

**Files:**
- Create: `packages/ui/src/components/PricingTable.tsx`
- Create: `packages/ui/src/components/PricingTable.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/PricingTable.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PricingTable } from './PricingTable'

const rows = [
  { label: 'PT PMA incorporation', govFee: 2_500_000, ourFee: 18_000_000 },
  { label: 'KBLI classification & OSS', govFee: 0, ourFee: 4_000_000 },
]

describe('PricingTable', () => {
  it('renders rows with tabular-nums and total', () => {
    render(<PricingTable headers={{ service: 'Service', govFee: 'Gov. fee', ourFee: 'Our fee', total: 'Total' }} currency="IDR" rows={rows} totalLabel="Starter package" />)
    expect(screen.getByText('PT PMA incorporation')).toBeInTheDocument()
    const totals = screen.getAllByText(/IDR/i)
    expect(totals.length).toBeGreaterThan(0)
    const tbl = screen.getByRole('table')
    expect(tbl.className).toMatch(/tabular-nums/)
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/PricingTable.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

export type PricingRow = { label: string; govFee: number; ourFee: number }

export type PricingTableProps = {
  headers: { service: string; govFee: string; ourFee: string; total: string }
  rows: PricingRow[]
  currency: string
  totalLabel: string
  className?: string
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US').format(amount) + ' ' + currency
}

export function PricingTable({ headers, rows, currency, totalLabel, className }: PricingTableProps) {
  const total = rows.reduce((s, r) => s + r.govFee + r.ourFee, 0)
  return (
    <table className={cn('w-full border-collapse font-body tabular-nums text-body-md', className)}>
      <thead>
        <tr className="border-b border-ink-900/15">
          <th className="py-3 text-left text-eyebrow uppercase tracking-[0.08em] text-ink-700">{headers.service}</th>
          <th className="py-3 text-right text-eyebrow uppercase tracking-[0.08em] text-ink-700">{headers.govFee}</th>
          <th className="py-3 text-right text-eyebrow uppercase tracking-[0.08em] text-ink-700">{headers.ourFee}</th>
          <th className="py-3 text-right text-eyebrow uppercase tracking-[0.08em] text-ink-700">{headers.total}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label} className={cn('border-b border-ink-900/[0.08]', i % 2 === 1 && 'bg-bone-100')}>
            <td className="py-4 text-ink-900">{r.label}</td>
            <td className="py-4 text-right text-ink-700">{fmt(r.govFee, currency)}</td>
            <td className="py-4 text-right text-ink-700">{fmt(r.ourFee, currency)}</td>
            <td className="py-4 text-right text-ink-900">{fmt(r.govFee + r.ourFee, currency)}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-ochre-600">
          <td className="py-4 font-medium text-ink-900">{totalLabel}</td>
          <td colSpan={2} />
          <td className="py-4 text-right font-medium text-ochre-700 underline decoration-ochre-600 decoration-2 underline-offset-4">{fmt(total, currency)}</td>
        </tr>
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test PricingTable
git add packages/ui/src/components/PricingTable.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): PricingTable transparent editorial table (DS §18.4)

Tabular-nums, alternating rows, ochre-underlined total. Material
differentiator vs competitors who hide pricing behind contact forms.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: EditorialTimeline

**Files:**
- Create: `packages/ui/src/components/EditorialTimeline.tsx`
- Create: `packages/ui/src/components/EditorialTimeline.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/EditorialTimeline.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EditorialTimeline } from './EditorialTimeline'

const steps = [
  { week: 'Week 1', label: 'Name reservation & deed preparation', who: 'we' as const, docs: ['passport scan', 'address proof'] },
  { week: 'Week 2', label: 'Notarial deed signing', who: 'joint' as const },
]

describe('EditorialTimeline', () => {
  it('renders each step with week, label, doer, docs', () => {
    render(<EditorialTimeline steps={steps} labels={{ we: 'We handle', joint: 'Joint', you: 'You provide' }} />)
    expect(screen.getByText('Week 1')).toBeInTheDocument()
    expect(screen.getByText('Name reservation & deed preparation')).toBeInTheDocument()
    expect(screen.getByText(/passport scan/)).toBeInTheDocument()
    expect(screen.getByText('We handle')).toBeInTheDocument()
    expect(screen.getByText('Joint')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/EditorialTimeline.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

export type TimelineStep = {
  week: string
  label: string
  who: 'we' | 'joint' | 'you'
  docs?: string[]
}

export type EditorialTimelineProps = {
  steps: TimelineStep[]
  labels: { we: string; joint: string; you: string }
  className?: string
}

export function EditorialTimeline({ steps, labels, className }: EditorialTimelineProps) {
  return (
    <ol className={cn('relative ml-6 border-l border-ink-900/15', className)}>
      {steps.map((s, i) => (
        <li key={i} className="relative pb-12 pl-8">
          <span className="absolute -left-[7px] top-2 h-3 w-3 rounded-full bg-ink-900" aria-hidden />
          <div className="font-mono text-mono-sm tabular-nums uppercase tracking-[0.08em] text-ink-500">{s.week}</div>
          <div className="mt-2 text-body-lg text-ink-900">{s.label}</div>
          <div className="mt-2 text-body-sm text-ink-700">
            <span className="font-medium">{labels[s.who]}.</span>
            {s.docs && s.docs.length > 0 && <span> Docs: {s.docs.join(', ')}.</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test EditorialTimeline
git add packages/ui/src/components/EditorialTimeline.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): EditorialTimeline for service process (DS §19.2)

Vertical timeline w/ week labels, doer attribution (we/joint/you),
and docs list per step. Replaces flowchart pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: EditorialQuote

**Files:**
- Create: `packages/ui/src/components/EditorialQuote.tsx`
- Create: `packages/ui/src/components/EditorialQuote.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/EditorialQuote.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EditorialQuote } from './EditorialQuote'

describe('EditorialQuote', () => {
  it('renders quote and attribution', () => {
    render(<EditorialQuote quote="They handled the BKPM filing in two weeks." author="Maria Tanaka" role="Founder, Solstice KK" />)
    expect(screen.getByText(/BKPM filing/)).toBeInTheDocument()
    expect(screen.getByText('Maria Tanaka')).toBeInTheDocument()
    expect(screen.getByText('Founder, Solstice KK')).toBeInTheDocument()
  })

  it('uses display serif font for quote', () => {
    render(<EditorialQuote quote="x" author="A" role="R" />)
    expect(screen.getByText('x')).toHaveClass('font-display')
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/EditorialQuote.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

export type EditorialQuoteProps = {
  quote: React.ReactNode
  author: string
  role: string
  className?: string
}

export function EditorialQuote({ quote, author, role, className }: EditorialQuoteProps) {
  return (
    <figure className={cn('mx-auto max-w-editorial px-6 py-16 md:px-10', className)}>
      <blockquote className="font-display text-display-md leading-[1.2] text-ink-900">{quote}</blockquote>
      <figcaption className="mt-6 text-body-sm text-ink-700">
        <span className="font-medium text-ink-900">{author}</span> · {role}
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test EditorialQuote
git add packages/ui/src/components/EditorialQuote.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): EditorialQuote for testimonials (DS §7.7)

Large serif quote with small attribution. No star ratings, no avatar
bubbles, no oversized quote-mark icons.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: StickyTOC (scroll-spy)

**Files:**
- Create: `packages/ui/src/components/StickyTOC.tsx`
- Create: `packages/ui/src/components/StickyTOC.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/StickyTOC.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StickyTOC } from './StickyTOC'

const items = [
  { id: 'overview', label: 'Overview' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'timeline', label: 'Timeline' },
]

describe('StickyTOC', () => {
  it('renders items as anchor links', () => {
    render(<StickyTOC heading="On this page" items={items} primaryCta={{ label: 'Book', href: '/contact' }} activeId="overview" />)
    expect(screen.getByText('On this page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '#overview')
    expect(screen.getByRole('link', { name: 'Book' })).toBeInTheDocument()
  })

  it('marks active item with stronger style', () => {
    render(<StickyTOC heading="x" items={items} primaryCta={{ label: 'b', href: '/c' }} activeId="timeline" />)
    expect(screen.getByRole('link', { name: 'Timeline' })).toHaveClass('text-ink-900')
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveClass('text-ink-500')
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/StickyTOC.tsx
'use client'
import * as React from 'react'
import { cn } from '../lib/cn'
import { Button } from './Button'

export type TocItem = { id: string; label: string }

export type StickyTOCProps = {
  heading: string
  items: TocItem[]
  primaryCta: { label: string; href: string }
  activeId?: string
  className?: string
  Link?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>
}

function DefaultLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className}>{children}</a>
}

export function StickyTOC({ heading, items, primaryCta, activeId, className, Link = DefaultLink }: StickyTOCProps) {
  return (
    <aside className={cn('sticky top-24 hidden w-[200px] flex-shrink-0 md:block', className)}>
      <p className="mb-4 text-eyebrow uppercase tracking-[0.08em] text-ink-700">{heading}</p>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={cn('block text-body-md underline-offset-4 hover:underline',
                activeId === it.id ? 'text-ink-900' : 'text-ink-500')}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <Button asChild variant="primary" size="sm" className="w-full">
          <Link href={primaryCta.href}>{primaryCta.label} →</Link>
        </Button>
      </div>
    </aside>
  )
}

export function useScrollSpy(ids: string[], rootMargin = '-30% 0px -60% 0px') {
  const [activeId, setActiveId] = React.useState<string | undefined>(ids[0])
  React.useEffect(() => {
    const observers = ids.map((id) => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id) },
        { rootMargin, threshold: 0 },
      )
      obs.observe(el)
      return obs
    })
    return () => { observers.forEach((o) => o?.disconnect()) }
  }, [ids.join('|'), rootMargin])
  return activeId
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test StickyTOC
git add packages/ui/src/components/StickyTOC.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): StickyTOC + useScrollSpy (DS §18.3 §19.3)

Sticky service-detail sidebar with on-this-page anchors, primary CTA,
and IntersectionObserver-based scroll-spy hook.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: InsightCard

**Files:**
- Create: `packages/ui/src/components/InsightCard.tsx`
- Create: `packages/ui/src/components/InsightCard.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/InsightCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { InsightCard } from './InsightCard'

describe('InsightCard', () => {
  it('renders category, date, read time, title, lead, link', () => {
    render(<InsightCard category="Regulation" date="2026-05-10" readTime={6} title="BKPM Reg 5/2025: What changes" lead="Minimum capital and licensing implications." href="/insights/bkpm-reg-5-2025" />)
    expect(screen.getByText('Regulation')).toBeInTheDocument()
    expect(screen.getByText(/6 min read/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /BKPM Reg 5\/2025/ })).toHaveAttribute('href', '/insights/bkpm-reg-5-2025')
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/InsightCard.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

export type InsightCardProps = {
  category: string
  date: string
  readTime: number
  title: string
  lead: string
  href: string
  className?: string
  Link?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>
}

function DefaultLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className}>{children}</a>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function InsightCard({ category, date, readTime, title, lead, href, className, Link = DefaultLink }: InsightCardProps) {
  return (
    <article className={cn('border-t border-ink-900/[0.08] py-10', className)}>
      <div className="flex flex-wrap items-center gap-2 text-eyebrow uppercase tracking-[0.08em] text-ink-700">
        <span>{category}</span>
        <span aria-hidden> · </span>
        <time dateTime={date}>{formatDate(date)}</time>
        <span aria-hidden> · </span>
        <span>{readTime} min read</span>
      </div>
      <h3 className="mt-4 font-display text-display-md text-ink-900">
        <Link href={href} className="underline-offset-4 hover:underline">{title}</Link>
      </h3>
      <p className="mt-3 max-w-prose text-body-md text-ink-700">{lead}</p>
    </article>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test InsightCard
git add packages/ui/src/components/InsightCard.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): InsightCard editorial preview (DS §21.2)

Category · date · read time eyebrow, serif headline as link, lead.
Hairline divider between cards, no thumbnail image v1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: ContactBlock

**Files:**
- Create: `packages/ui/src/components/ContactBlock.tsx`
- Create: `packages/ui/src/components/ContactBlock.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/ContactBlock.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ContactBlock } from './ContactBlock'

describe('ContactBlock', () => {
  it('renders partner name, role, email, WA', () => {
    render(<ContactBlock heading="Talk to a partner" partner={{ name: 'Diah Putri', role: 'Senior Consultant', email: 'diah@jakartabc.com', whatsapp: '+62-21-555-1234' }} />)
    expect(screen.getByText('Talk to a partner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /diah@jakartabc.com/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\+62-21-555-1234/i })).toHaveAttribute('href', expect.stringContaining('wa.me'))
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/ContactBlock.tsx
import * as React from 'react'
import { cn } from '../lib/cn'

export type ContactBlockProps = {
  heading: string
  partner: {
    name: string
    role: string
    email: string
    whatsapp?: string
    photoSrc?: string
  }
  className?: string
}

export function ContactBlock({ heading, partner, className }: ContactBlockProps) {
  const waHref = partner.whatsapp ? `https://wa.me/${partner.whatsapp.replace(/[^0-9]/g, '')}` : undefined
  return (
    <section className={cn('border-t border-ink-900/[0.08] py-16', className)}>
      <div className="mx-auto flex max-w-editorial flex-col items-start gap-6 px-6 md:flex-row md:items-center md:gap-8 md:px-10">
        {partner.photoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.photoSrc} alt="" className="h-20 w-20 rounded-full object-cover" />
        )}
        <div className="flex-1">
          <p className="text-eyebrow uppercase tracking-[0.08em] text-ink-700">{heading}</p>
          <p className="mt-2 font-display text-display-md text-ink-900">{partner.name}</p>
          <p className="mt-1 text-body-sm text-ink-700">{partner.role}</p>
          <p className="mt-4 text-body-md">
            <a href={`mailto:${partner.email}`} className="text-ochre-700 underline-offset-4 hover:underline">{partner.email}</a>
            {waHref && (
              <>
                <span aria-hidden className="mx-2 text-ink-500">·</span>
                <a href={waHref} className="text-ochre-700 underline-offset-4 hover:underline">{partner.whatsapp}</a>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test ContactBlock
git add packages/ui/src/components/ContactBlock.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): ContactBlock inline partner contact (DS §19.8)

Replaces chat widget anti-pattern with inline email + WhatsApp partner
contact at end of each service page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: BookingForm visual stub

**Files:**
- Create: `packages/ui/src/components/BookingForm.tsx`
- Create: `packages/ui/src/components/BookingForm.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/BookingForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BookingForm } from './BookingForm'

const labels = {
  name: 'Name', email: 'Email', company: 'Company', phone: 'Phone',
  service: 'Service', preferredWindows: 'Preferred times', message: 'Message',
  submit: 'Send request', sending: 'Sending…',
}

const services = [
  { slug: 'pt-pma-setup', name: 'PT PMA Setup' },
  { slug: 'sector-licensing', name: 'Sector Licensing' },
]

describe('BookingForm (visual stub)', () => {
  it('renders all fields and submit button', () => {
    render(<BookingForm labels={labels} services={services} state="idle" onSubmit={() => {}} />)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Service')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send request' })).toBeInTheDocument()
  })

  it('shows loading label when state=loading', () => {
    render(<BookingForm labels={labels} services={services} state="loading" onSubmit={() => {}} />)
    expect(screen.getByRole('button')).toHaveTextContent(/Sending/)
  })

  it('renders inline success message when state=success', () => {
    render(<BookingForm labels={labels} services={services} state="success" successMessage="Thanks. We'll reply within 1 business day." onSubmit={() => {}} />)
    expect(screen.queryByLabelText('Name')).toBeNull()
    expect(screen.getByText(/within 1 business day/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/components/BookingForm.tsx
'use client'
import * as React from 'react'
import { cn } from '../lib/cn'
import { Button } from './Button'
import { Input } from './Input'

export type BookingFormLabels = {
  name: string; email: string; company: string; phone: string
  service: string; preferredWindows: string; message: string
  submit: string; sending: string
}

export type BookingFormState = 'idle' | 'loading' | 'success' | 'error'

export type BookingFormProps = {
  labels: BookingFormLabels
  services: { slug: string; name: string }[]
  state: BookingFormState
  errorMessage?: string
  successMessage?: string
  defaultService?: string
  onSubmit: (data: FormData) => void
  className?: string
}

const WINDOWS = ['mon-am', 'mon-pm', 'tue-am', 'tue-pm', 'wed-am', 'wed-pm', 'thu-am', 'thu-pm', 'fri-am', 'fri-pm'] as const

export function BookingForm({ labels, services, state, errorMessage, successMessage, defaultService, onSubmit, className }: BookingFormProps) {
  if (state === 'success') {
    return (
      <p className={cn('text-body-lg text-ink-900', className)}>{successMessage}</p>
    )
  }
  return (
    <form
      className={cn('flex flex-col gap-8', className)}
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget as HTMLFormElement)) }}
      noValidate
    >
      {/* honeypot */}
      <input name="hp" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />

      <Input name="name" label={labels.name} required autoComplete="name" />
      <Input name="email" type="email" label={labels.email} required autoComplete="email" />
      <Input name="company" label={labels.company} autoComplete="organization" />
      <Input name="phone" type="tel" label={labels.phone} autoComplete="tel" />

      <div className="flex flex-col gap-2">
        <label htmlFor="service" className="text-eyebrow uppercase tracking-[0.08em] text-ink-700">{labels.service}</label>
        <select id="service" name="service" defaultValue={defaultService} required
          className="border-b border-ink-500 bg-transparent py-2 text-body-md text-ink-900 focus:border-ochre-600 focus:border-b-2 focus:outline-none">
          <option value="" disabled>—</option>
          {services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-eyebrow uppercase tracking-[0.08em] text-ink-700">{labels.preferredWindows}</legend>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {WINDOWS.map((w) => (
            <label key={w} className="flex items-center gap-2 text-body-sm text-ink-900">
              <input type="checkbox" name="preferredWindows" value={w} />
              {w.toUpperCase()}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-eyebrow uppercase tracking-[0.08em] text-ink-700">{labels.message}</label>
        <textarea id="message" name="message" rows={5} required
          className="border-b border-ink-500 bg-transparent py-2 text-body-md text-ink-900 focus:border-ochre-600 focus:border-b-2 focus:outline-none" />
      </div>

      {state === 'error' && errorMessage && (
        <p role="alert" className="text-body-sm text-danger">{errorMessage}</p>
      )}

      <div data-cf-turnstile slot="turnstile" />

      <Button type="submit" variant="primary" size="lg" loading={state === 'loading'}>
        {state === 'loading' ? labels.sending : labels.submit}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test BookingForm
git add packages/ui/src/components/BookingForm.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): BookingForm visual stub w/ honeypot + state machine

Form layout + idle/loading/success/error states. Submit handler is a
prop; Phase 3 wires Server Action. Honeypot field hidden via sr-only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: ContactForm visual stub

**Files:**
- Create: `packages/ui/src/components/ContactForm.tsx`
- Create: `packages/ui/src/components/ContactForm.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/src/components/ContactForm.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ContactForm } from './ContactForm'

const labels = { name: 'Name', email: 'Email', company: 'Company', message: 'Message', submit: 'Send', sending: 'Sending…' }

describe('ContactForm', () => {
  it('renders 4 fields per DS §12', () => {
    render(<ContactForm labels={labels} state="idle" onSubmit={() => {}} />)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Company')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement (same pattern as BookingForm, simpler)**

```tsx
// packages/ui/src/components/ContactForm.tsx
'use client'
import * as React from 'react'
import { cn } from '../lib/cn'
import { Button } from './Button'
import { Input } from './Input'

export type ContactFormLabels = { name: string; email: string; company: string; message: string; submit: string; sending: string }
export type ContactFormState = 'idle' | 'loading' | 'success' | 'error'
export type ContactFormProps = {
  labels: ContactFormLabels
  state: ContactFormState
  errorMessage?: string
  successMessage?: string
  onSubmit: (data: FormData) => void
  className?: string
}

export function ContactForm({ labels, state, errorMessage, successMessage, onSubmit, className }: ContactFormProps) {
  if (state === 'success') return <p className={cn('text-body-lg text-ink-900', className)}>{successMessage}</p>
  return (
    <form className={cn('flex flex-col gap-8', className)}
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget as HTMLFormElement)) }} noValidate>
      <input name="hp" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />
      <Input name="name" label={labels.name} required autoComplete="name" />
      <Input name="email" type="email" label={labels.email} required autoComplete="email" />
      <Input name="company" label={labels.company} autoComplete="organization" />
      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-eyebrow uppercase tracking-[0.08em] text-ink-700">{labels.message}</label>
        <textarea id="message" name="message" rows={5} required
          className="border-b border-ink-500 bg-transparent py-2 text-body-md text-ink-900 focus:border-ochre-600 focus:border-b-2 focus:outline-none" />
      </div>
      {state === 'error' && errorMessage && <p role="alert" className="text-body-sm text-danger">{errorMessage}</p>}
      <Button type="submit" variant="primary" size="lg" loading={state === 'loading'}>
        {state === 'loading' ? labels.sending : labels.submit}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm --filter @jakartabc/ui test ContactForm
git add packages/ui/src/components/ContactForm.{tsx,test.tsx} packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): ContactForm visual stub (DS §12)

4-field minimal form. Same state machine as BookingForm. Phase 3
wires submit Server Action.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: Home page `/`

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx`
- Modify: `apps/web/messages/en.json` (add `home.*` keys)
- Modify: `apps/web/messages/id.json` (add `home.*` keys)
- Modify: `apps/web/e2e/marketing.spec.ts`

- [ ] **Step 1: Append home messages**

```json
// in en.json, merge:
{
  "home": {
    "eyebrow": "FOREIGN DIRECT INVESTMENT · INDONESIA",
    "headline": "Set up a PT PMA in Indonesia. Without the guesswork.",
    "lead": "Foreign-owned company registration, sector licensing, and ongoing compliance — handled by a Jakarta team that has done it 400+ times.",
    "primaryCta": "Book a 30-min call",
    "secondaryCta": "See how it works",
    "servicesEyebrow": "WHAT WE DO",
    "servicesRead": "Read",
    "services": [
      { "slug": "pt-pma-setup", "title": "PT PMA Setup", "desc": "Foreign-owned LLC registration, end to end.", "timeline": "4–6 wks" },
      { "slug": "sector-licensing", "title": "Sector Licensing", "desc": "OSS, KBLI, sector-specific permits.", "timeline": "2–8 wks" },
      { "slug": "tax-accounting", "title": "Tax & Accounting", "desc": "Monthly tax filing, payroll, annual reporting.", "timeline": "ongoing" },
      { "slug": "investor-kitas", "title": "Investor KITAS", "desc": "Residency for foreign shareholders and directors.", "timeline": "3–4 wks" }
    ],
    "quote": "They handled the BKPM filing in two weeks. No surprises in the fee at the end.",
    "quoteAuthor": "Maria Tanaka",
    "quoteRole": "Founder, Solstice KK"
  }
}
```

ID version uses translated labels with same keys (translator owns copy).

- [ ] **Step 2: Implement Home**

```tsx
// apps/web/src/app/[locale]/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Hero, EditorialList, EditorialQuote, Eyebrow, RuleDivider } from '@jakartabc/ui'
import { LocalizedLink } from '@/components/LocalizedLink'

export default async function Home({ params }: { params: Promise<{ locale: 'en' | 'id' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const services = t.raw('services') as { slug: string; title: string; desc: string; timeline: string }[]

  return (
    <>
      <Hero
        eyebrow={t('eyebrow')}
        headline={t('headline')}
        lead={t('lead')}
        primary={{ label: t('primaryCta'), href: '/contact' }}
        secondary={{ label: t('secondaryCta'), href: '/services' }}
        Link={LocalizedLink}
      />

      <section className="mx-auto max-w-container px-6 py-24 md:px-10">
        <Eyebrow>{t('servicesEyebrow')}</Eyebrow>
        <div className="mt-2"><RuleDivider weight="firm" /></div>
        <EditorialList
          items={services}
          hrefPrefix="/services"
          readLabel={t('servicesRead')}
          Link={LocalizedLink}
        />
      </section>

      <EditorialQuote
        quote={t('quote')}
        author={t('quoteAuthor')}
        role={t('quoteRole')}
      />
    </>
  )
}
```

- [ ] **Step 3: Update e2e**

```ts
// apps/web/e2e/marketing.spec.ts (append)
for (const locale of ['en', 'id'] as const) {
  test(`home renders editorial list and quote @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/' : '/id')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('01')).toBeVisible()
    await expect(page.getByText('04')).toBeVisible()
  })
}
```

- [ ] **Step 4: Run e2e pass + commit**

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
git add apps/web/src/app/[locale]/page.tsx apps/web/messages/*.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): Home page bilingual editorial layout

Hero + services EditorialList + EditorialQuote. No counters, no logo
carousel, no card grid — quiet editorial home per DS §12 + §18.1 + §18.2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: Services overview `/services`

**Files:**
- Create: `apps/web/src/app/[locale]/services/page.tsx`
- Modify: `apps/web/messages/{en,id}.json` (add `services.*` keys)

- [ ] **Step 1: Append messages**

```json
// en.json
{
  "services": {
    "eyebrow": "WHAT WE DO",
    "headline": "Foreign direct investment in Indonesia, end to end.",
    "lead": "Four core services. Editorial transparency on what's included, how long it takes, and what it costs.",
    "readLabel": "Read",
    "list": [
      { "slug": "pt-pma-setup", "title": "PT PMA Setup", "desc": "Foreign-owned LLC registration, end to end.", "timeline": "4–6 wks" },
      { "slug": "sector-licensing", "title": "Sector Licensing", "desc": "OSS, KBLI, sector-specific permits.", "timeline": "2–8 wks" },
      { "slug": "tax-accounting", "title": "Tax & Accounting", "desc": "Monthly tax filing, payroll, annual reporting.", "timeline": "ongoing" },
      { "slug": "investor-kitas", "title": "Investor KITAS", "desc": "Residency for foreign shareholders and directors.", "timeline": "3–4 wks" }
    ]
  }
}
```

- [ ] **Step 2: Implement**

```tsx
// apps/web/src/app/[locale]/services/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DisplayHeading, EditorialList, Eyebrow, RuleDivider } from '@jakartabc/ui'
import { LocalizedLink } from '@/components/LocalizedLink'

export default async function ServicesIndex({ params }: { params: Promise<{ locale: 'en' | 'id' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('services')
  const list = t.raw('list') as { slug: string; title: string; desc: string; timeline: string }[]

  return (
    <>
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-editorial">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-6">{t('headline')}</DisplayHeading>
          <p className="mt-8 max-w-prose text-body-lg text-ink-700">{t('lead')}</p>
        </div>
      </section>
      <div className="mx-auto max-w-container px-6 md:px-10"><RuleDivider weight="firm" /></div>
      <EditorialList items={list} hrefPrefix="/services" readLabel={t('readLabel')} Link={LocalizedLink} />
    </>
  )
}
```

- [ ] **Step 3: e2e + commit**

```ts
// apps/web/e2e/marketing.spec.ts (append)
for (const locale of ['en', 'id'] as const) {
  test(`services overview renders 4 items @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/services' : '/id/services')
    await expect(page.getByText('01')).toBeVisible()
    await expect(page.getByText('04')).toBeVisible()
  })
}
```

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
git add apps/web/src/app/[locale]/services/page.tsx apps/web/messages/*.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): services overview page (DS §18.2)

Hero + EditorialList of 4 services. Phase 2 will source list from CMS;
Phase 1 reads from locale JSON.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: Service detail `/services/[slug]` + MDX loader integration

**Files:**
- Create: `apps/web/src/app/[locale]/services/[slug]/page.tsx`
- Create: `apps/web/src/components/MdxBody.tsx`
- Modify: `apps/web/messages/{en,id}.json` (add `serviceDetail.*` keys)

- [ ] **Step 1: Append messages**

```json
// en.json
{
  "serviceDetail": {
    "tocHeading": "On this page",
    "ctaBook": "Book a 30-min call",
    "overview": "OVERVIEW",
    "whoFor": "WHO IT'S FOR",
    "requirements": "REQUIREMENTS",
    "timeline": "TIMELINE",
    "cost": "COST",
    "faq": "FAQ",
    "regulationsCited": "REGULATIONS CITED",
    "timelineLabels": { "we": "We handle", "joint": "Joint", "you": "You provide" }
  }
}
```

- [ ] **Step 2: MDX body renderer**

```tsx
// apps/web/src/components/MdxBody.tsx
import { MDXRemote } from 'next-mdx-remote/rsc'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

const components = {
  h1: (props: any) => <DisplayHeading as="h1" size="lg" {...props} />,
  h2: (props: any) => <DisplayHeading as="h2" size="md" className="mt-16" {...props} />,
  h3: (props: any) => <h3 className="mt-12 font-display text-heading-lg text-ink-900" {...props} />,
  p:  (props: any) => <p className="mt-6 max-w-prose text-body-md leading-relaxed text-ink-700" {...props} />,
  ul: (props: any) => <ul className="mt-6 max-w-prose list-disc space-y-2 pl-6 text-body-md text-ink-700" {...props} />,
  ol: (props: any) => <ol className="mt-6 max-w-prose list-decimal space-y-2 pl-6 text-body-md text-ink-700" {...props} />,
  Eyebrow,
}

export function MdxBody({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />
}
```

Install `next-mdx-remote`:

```bash
pnpm --filter @jakartabc/web add next-mdx-remote
```

- [ ] **Step 3: Service detail page**

```tsx
// apps/web/src/app/[locale]/services/[slug]/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { DisplayHeading, Eyebrow, StickyTOC, EditorialTimeline, PricingTable, ContactBlock } from '@jakartabc/ui'
import { LocalizedLink } from '@/components/LocalizedLink'
import { MdxBody } from '@/components/MdxBody'
import { listServiceSlugs, loadServiceMdx } from '@/lib/mdx'

export function generateStaticParams() {
  const locales = ['en', 'id'] as const
  return locales.flatMap((locale) =>
    listServiceSlugs().map((slug) => ({ locale, slug }))
  )
}

export default async function ServiceDetail({ params }: { params: Promise<{ locale: 'en' | 'id'; slug: string }> }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  let mdx
  try { mdx = await loadServiceMdx(slug, locale) } catch { notFound() }
  const t = await getTranslations('serviceDetail')
  const labels = t.raw('timelineLabels') as { we: string; joint: string; you: string }

  const tocItems = [
    { id: 'overview', label: t('overview') },
    { id: 'who-for', label: t('whoFor') },
    { id: 'requirements', label: t('requirements') },
    { id: 'timeline', label: t('timeline') },
    { id: 'cost', label: t('cost') },
    { id: 'faq', label: t('faq') },
  ]

  return (
    <article className="mx-auto max-w-container px-6 py-16 md:px-10">
      <header className="mb-16">
        <Eyebrow>{slug.toUpperCase().replace(/-/g, ' ')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-6">{mdx.frontmatter.title}</DisplayHeading>
        <p className="mt-6 max-w-prose text-body-lg text-ink-700">{mdx.frontmatter.leadParagraph}</p>
      </header>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-[200px_1fr]">
        <StickyTOC heading={t('tocHeading')} items={tocItems} primaryCta={{ label: t('ctaBook'), href: '/contact' }} Link={LocalizedLink} />
        <div className="max-w-prose">
          <MdxBody source={mdx.content} />

          {mdx.frontmatter.pricing && (
            <section id="cost" className="mt-24">
              <Eyebrow>{t('cost')}</Eyebrow>
              <div className="mt-6">
                <PricingTable
                  headers={{ service: 'Service', govFee: 'Gov. fee', ourFee: 'Our fee', total: 'Total' }}
                  rows={[{ label: mdx.frontmatter.title, govFee: mdx.frontmatter.pricing.govFee, ourFee: mdx.frontmatter.pricing.ourFee }]}
                  currency={mdx.frontmatter.pricing.currency}
                  totalLabel="Starter"
                />
              </div>
            </section>
          )}
        </div>
      </div>

      <ContactBlock
        heading={locale === 'en' ? 'Talk to a partner' : 'Bicara dengan partner'}
        partner={{ name: 'Diah Putri', role: locale === 'en' ? 'Senior Consultant' : 'Konsultan Senior', email: 'diah@jakartabc.com', whatsapp: '+62-21-555-1234' }}
      />
    </article>
  )
}
```

- [ ] **Step 4: e2e**

```ts
// apps/web/e2e/marketing.spec.ts (append)
for (const locale of ['en', 'id'] as const) {
  test(`service detail PT PMA renders @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/services/pt-pma-setup' : '/id/services/pt-pma-setup')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /PT PMA/i })).toBeVisible()
  })
}
```

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
git add apps/web/src/app/[locale]/services/[slug] apps/web/src/components/MdxBody.tsx apps/web/messages/*.json apps/web/package.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): service detail page w/ MDX body + StickyTOC + pricing inline

Renders MDX from content/services/{slug}.{locale}.mdx with editorial
chrome: StickyTOC sidebar, body prose, inline pricing table,
ContactBlock at end. Phase 2 will swap MDX source for Payload Services
collection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: MDX content for 4 services × 2 locales

**Files:**
- Modify: `apps/web/content/services/pt-pma-setup.{en,id}.mdx`
- Modify: `apps/web/content/services/sector-licensing.{en,id}.mdx`
- Modify: `apps/web/content/services/tax-accounting.{en,id}.mdx`
- Modify: `apps/web/content/services/investor-kitas.{en,id}.mdx`

- [ ] **Step 1: Write full PT PMA Setup EN copy**

```mdx
<!-- apps/web/content/services/pt-pma-setup.en.mdx -->
---
title: PT PMA Setup
timelineLabel: 4–6 wks
leadParagraph: Foreign-owned company registration in Indonesia, end to end. We handle name reservation, notarial deed, Kemenkumham approval, NPWP, and OSS. You provide passport scans and the rest of the application package.
pricing:
  govFee: 2500000
  ourFee: 18000000
  currency: IDR
---

## Overview

A PT Penanaman Modal Asing (PT PMA) is the standard limited-liability vehicle for foreign-owned business in Indonesia. Minimum paid-up capital is IDR 2.5M under BKPM Reg 5/2025. Typical setup takes 4–6 weeks once documents are complete.

## Who it's for

- Foreign investors entering Indonesia for the first time
- Existing foreign businesses formalizing a local entity
- Foreign founders relocating to operate from Jakarta

## Requirements

- Passport scan (all foreign shareholders + directors)
- Address proof (any country)
- Proposed business activity (we map to KBLI codes)
- Statement of investment plan
- Local-address option (we provide if needed)

## Timeline

Detailed week-by-week schedule on this page. Indicative milestones:

- Week 1 — Name reservation + deed preparation
- Week 2 — Notarial deed signing (remote or in person)
- Week 3 — Kemenkumham approval
- Week 4 — NPWP + OSS registration
- Week 5–6 — Sector business license (if applicable)

## Outside our scope

We do not handle: sector permits requiring specialized local sponsorship (e.g., mining), foreign-currency repatriation strategy, M&A due diligence. We can refer.

## FAQ

**Can I be the sole shareholder?**
Yes, PT PMA permits 100% foreign ownership in most sectors (with the Positive Investment List as a check).

**Do I need to be in Jakarta during setup?**
Not for most steps. Notarial deed can be signed via video notary; a few sector permits may require in-person presence.
```

- [ ] **Step 2: Write PT PMA Setup ID copy**

```mdx
<!-- apps/web/content/services/pt-pma-setup.id.mdx -->
---
title: Pendirian PT PMA
timelineLabel: 4–6 minggu
leadParagraph: Pendirian perusahaan dengan kepemilikan asing di Indonesia, end-to-end. Kami menangani reservasi nama, akta notaris, persetujuan Kemenkumham, NPWP, dan OSS.
pricing:
  govFee: 2500000
  ourFee: 18000000
  currency: IDR
---

## Gambaran

PT Penanaman Modal Asing (PT PMA) adalah bentuk perseroan terbatas standar untuk usaha milik asing di Indonesia. Modal disetor minimum IDR 2,5 juta berdasarkan BKPM Reg 5/2025. Waktu setup tipikal 4–6 minggu setelah dokumen lengkap.

## Untuk siapa

- Investor asing yang baru masuk Indonesia
- Bisnis asing yang sedang formalisasi entitas lokal
- Founder asing yang relokasi operasi ke Jakarta

## Persyaratan

- Scan paspor (semua pemegang saham + direktur asing)
- Bukti alamat (negara mana pun)
- Aktivitas usaha (kami petakan ke kode KBLI)
- Pernyataan rencana investasi
- Opsi alamat lokal (kami sediakan bila perlu)

## Timeline

Jadwal mingguan detail di halaman ini. Milestone indikatif:

- Minggu 1 — Reservasi nama + persiapan akta
- Minggu 2 — Penandatanganan akta notaris (jarak jauh atau langsung)
- Minggu 3 — Persetujuan Kemenkumham
- Minggu 4 — NPWP + registrasi OSS
- Minggu 5–6 — Izin usaha sektoral (jika berlaku)

## Di luar lingkup kami

Kami tidak menangani: izin sektor yang butuh sponsor lokal khusus (mis. pertambangan), strategi repatriasi mata uang asing, due diligence M&A. Kami bisa merekomendasikan rekan.

## FAQ

**Bisakah saya jadi pemegang saham tunggal?**
Ya, PT PMA mengizinkan kepemilikan asing 100% di sebagian besar sektor (dengan Daftar Positif Investasi sebagai patokan).

**Apakah saya harus di Jakarta selama proses?**
Tidak untuk sebagian besar langkah. Akta notaris bisa lewat video notary; beberapa izin sektor mungkin perlu kehadiran langsung.
```

- [ ] **Step 3: Sector Licensing EN + ID (same structure, sector-specific content)**

Write `sector-licensing.en.mdx` + `sector-licensing.id.mdx` with frontmatter:
```yaml
title: Sector Licensing (EN) / Perizinan Sektoral (ID)
timelineLabel: 2–8 wks
leadParagraph: OSS, KBLI classification, and sector-specific permits beyond the base PT PMA.
pricing:
  govFee: 0
  ourFee: 4000000
  currency: IDR
```
Body sections: Overview, Who it's for, Requirements, Timeline, FAQ — written following same template as Task 21 Step 1.

- [ ] **Step 4: Tax & Accounting EN + ID**

Frontmatter:
```yaml
title: Tax & Accounting / Pajak & Akuntansi
timelineLabel: ongoing
leadParagraph: Monthly tax filing (VAT, PPh), payroll, and annual financial statements per Indonesian GAAP.
pricing:
  govFee: 0
  ourFee: 6000000
  currency: IDR
```
Body: same template.

- [ ] **Step 5: Investor KITAS EN + ID**

Frontmatter:
```yaml
title: Investor KITAS / KITAS Investor
timelineLabel: 3–4 wks
leadParagraph: Indonesian residency permit for foreign shareholders and directors of a PT PMA.
pricing:
  govFee: 1500000
  ourFee: 8000000
  currency: IDR
```
Body: same template.

- [ ] **Step 6: Commit**

```bash
git add apps/web/content/services
git commit -m "$(cat <<'EOF'
content(services): real bilingual MDX for 4 services

Replaces Task 1 stubs with full editorial copy per DS §3 tone-of-voice
(direct, factual, concrete numbers). Phase 2 migrates to Payload Services
collection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: Pricing page `/pricing`

**Files:**
- Create: `apps/web/src/app/[locale]/pricing/page.tsx`
- Modify: `apps/web/messages/{en,id}.json` (add `pricing.*`)

- [ ] **Step 1: Append messages**

```json
// en.json
{
  "pricing": {
    "eyebrow": "WHAT YOU PAY",
    "headline": "Transparent pricing. No hidden costs.",
    "lead": "Government fees and our fee, line by line. Estimates valid as of May 2026.",
    "tableHeaders": { "service": "Service", "govFee": "Gov. fee", "ourFee": "Our fee", "total": "Total" },
    "starter": "Starter package",
    "footnote": "Estimates as of May 2026. No hidden costs. Custom quotes for regulated sectors.",
    "ctaQuote": "Get a tailored quote"
  }
}
```

- [ ] **Step 2: Implement**

```tsx
// apps/web/src/app/[locale]/pricing/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DisplayHeading, Eyebrow, PricingTable, Button } from '@jakartabc/ui'
import { LocalizedLink } from '@/components/LocalizedLink'
import { listServiceSlugs, loadServiceMdx } from '@/lib/mdx'

export default async function Pricing({ params }: { params: Promise<{ locale: 'en' | 'id' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('pricing')

  const services = await Promise.all(listServiceSlugs().map((slug) => loadServiceMdx(slug, locale)))
  const rows = services
    .filter((s) => s.frontmatter.pricing)
    .map((s) => ({
      label: s.frontmatter.title,
      govFee: s.frontmatter.pricing!.govFee,
      ourFee: s.frontmatter.pricing!.ourFee,
    }))

  return (
    <section className="mx-auto max-w-container px-6 py-24 md:px-10 md:py-32">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">{t('headline')}</DisplayHeading>
      <p className="mt-8 max-w-prose text-body-lg text-ink-700">{t('lead')}</p>

      <div className="mt-16">
        <PricingTable
          headers={t.raw('tableHeaders') as { service: string; govFee: string; ourFee: string; total: string }}
          rows={rows}
          currency="IDR"
          totalLabel={t('starter')}
        />
      </div>

      <p className="mt-12 max-w-prose text-body-sm text-ink-500">{t('footnote')}</p>

      <div className="mt-12">
        <Button asChild variant="primary" size="lg">
          <LocalizedLink href="/contact">{t('ctaQuote')} →</LocalizedLink>
        </Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: e2e + commit**

```ts
// apps/web/e2e/marketing.spec.ts (append)
for (const locale of ['en', 'id'] as const) {
  test(`pricing renders 4 rows @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/pricing' : '/id/pricing')
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByText(/IDR/i).first()).toBeVisible()
  })
}
```

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
git add apps/web/src/app/[locale]/pricing apps/web/messages/*.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): transparent pricing page (DS §18.4, §17 differentiator)

Reads gov/our fee from MDX frontmatter. Phase 2 reads from Payload
Services.pricing instead. No "contact for quote" gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: About page `/about`

**Files:**
- Create: `apps/web/src/app/[locale]/about/page.tsx`
- Create: `apps/web/public/images/founder-signature.svg` (placeholder)
- Modify: `apps/web/messages/{en,id}.json` (add `about.*`)

- [ ] **Step 1: Append messages**

```json
// en.json
{
  "about": {
    "eyebrow": "ABOUT",
    "headline": "A boutique Jakarta firm. Quiet, specific, accountable.",
    "lead": "We started Jakarta Business Center to bring editorial clarity to foreign direct investment in Indonesia.",
    "founderEyebrow": "FROM THE FOUNDER",
    "founderNote": "When I founded Jakarta BC in 2019, I'd already watched a dozen friends abandon Indonesia ventures over avoidable licensing surprises. The premise of this firm is simple: tell investors what it actually takes, with real numbers and real timelines. No theater. Diah Putri, Founder.",
    "teamEyebrow": "TEAM",
    "team": [
      { "name": "Diah Putri", "role": "Founder, Senior Consultant" },
      { "name": "Andi Wirawan", "role": "Tax & Accounting Lead" },
      { "name": "Maya Hadi", "role": "Sector Licensing Lead" }
    ],
    "licensesEyebrow": "LICENSES & REGISTRATION",
    "licenses": [
      "BKPM Licensed Consultant — Reg 001/2025",
      "Bar Association of Jakarta member",
      "ICAI registered firm"
    ]
  }
}
```

ID version: same keys, translated copy.

- [ ] **Step 2: Implement**

```tsx
// apps/web/src/app/[locale]/about/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DisplayHeading, Eyebrow, RuleDivider, ContactBlock } from '@jakartabc/ui'

export default async function About({ params }: { params: Promise<{ locale: 'en' | 'id' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('about')
  const team = t.raw('team') as { name: string; role: string }[]
  const licenses = t.raw('licenses') as string[]

  return (
    <>
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-editorial">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-6">{t('headline')}</DisplayHeading>
          <p className="mt-8 max-w-prose text-body-lg text-ink-700">{t('lead')}</p>
        </div>
      </section>

      <section className="bg-ink-900 px-6 py-24 text-bone-100 md:px-10 md:py-32">
        <div className="mx-auto max-w-editorial">
          <Eyebrow className="!text-bone-200">{t('founderEyebrow')}</Eyebrow>
          <p className="mt-6 font-display text-display-md leading-[1.3]">{t('founderNote')}</p>
          {/* Founder signature SVG placeholder — replace with scan asset before launch */}
          <img src="/images/founder-signature.svg" alt="" className="mt-8 h-14 w-auto opacity-80" />
        </div>
      </section>

      <section className="mx-auto max-w-container px-6 py-24 md:px-10">
        <Eyebrow>{t('teamEyebrow')}</Eyebrow>
        <ul className="mt-6 divide-y divide-ink-900/[0.08]">
          {team.map((m) => (
            <li key={m.name} className="grid grid-cols-1 gap-2 py-6 md:grid-cols-[1fr_2fr]">
              <span className="font-display text-display-md text-ink-900">{m.name}</span>
              <span className="text-body-md text-ink-700">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-container px-6 pb-24 md:px-10">
        <Eyebrow>{t('licensesEyebrow')}</Eyebrow>
        <ul className="mt-6 space-y-2 text-body-md text-ink-900">
          {licenses.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </section>

      <ContactBlock
        heading={locale === 'en' ? 'Talk to a partner' : 'Bicara dengan partner'}
        partner={{ name: 'Diah Putri', role: locale === 'en' ? 'Founder' : 'Founder', email: 'diah@jakartabc.com', whatsapp: '+62-21-555-1234' }}
      />
    </>
  )
}
```

- [ ] **Step 3: Placeholder signature SVG**

```svg
<!-- apps/web/public/images/founder-signature.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none">
  <path d="M10 40 Q 30 10 50 40 T 90 30 T 130 35 T 170 25" stroke="#F2EDE4" stroke-width="2" fill="none" stroke-linecap="round" />
</svg>
```

Note: Replace with real scanned signature before production launch (Open Item §11 spec).

- [ ] **Step 4: e2e + commit**

```ts
// apps/web/e2e/marketing.spec.ts (append)
for (const locale of ['en', 'id'] as const) {
  test(`about renders founder note dark band @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/about' : '/id/about')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('img[src*="founder-signature"]')).toBeVisible()
  })
}
```

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
git add apps/web/src/app/[locale]/about apps/web/public/images/founder-signature.svg apps/web/messages/*.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): about page with dark founder-note band + team + licenses

DS §21.3 about template. Selective dark band per DS §24. Placeholder
SVG signature swapped for real scan before launch (Open Item).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 24: Insights list `/insights` empty state

**Files:**
- Create: `apps/web/src/app/[locale]/insights/page.tsx`
- Modify: `apps/web/messages/{en,id}.json` (add `insights.*`)

- [ ] **Step 1: Append messages**

```json
// en.json
{
  "insights": {
    "eyebrow": "INSIGHTS",
    "headline": "Editorial on Indonesian FDI, with citations.",
    "lead": "Long-form articles on regulations, sectors, and operational realities. No SEO listicles.",
    "empty": "No articles yet. Subscribe via the footer to be notified when we publish."
  }
}
```

- [ ] **Step 2: Implement (empty state v1, CMS in Phase 2)**

```tsx
// apps/web/src/app/[locale]/insights/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

export default async function InsightsList({ params }: { params: Promise<{ locale: 'en' | 'id' }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('insights')

  return (
    <section className="px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-editorial">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-6">{t('headline')}</DisplayHeading>
        <p className="mt-8 max-w-prose text-body-lg text-ink-700">{t('lead')}</p>
        <p className="mt-16 max-w-prose text-body-md text-ink-500">{t('empty')}</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: e2e + commit**

```ts
for (const locale of ['en', 'id'] as const) {
  test(`insights empty state @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/insights' : '/id/insights')
    await expect(page.getByText(/No articles yet|Belum ada/i)).toBeVisible()
  })
}
```

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
git add apps/web/src/app/[locale]/insights apps/web/messages/*.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): insights list empty state (DS §23)

Editorial copy + empty-state pointer to newsletter signup. Phase 2
replaces with Payload-driven list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 25: Contact page `/contact`

**Files:**
- Create: `apps/web/src/app/[locale]/contact/page.tsx`
- Modify: `apps/web/messages/{en,id}.json` (add `contact.*`)

- [ ] **Step 1: Append messages**

```json
// en.json
{
  "contact": {
    "eyebrow": "CONTACT",
    "headline": "Tell us what you need.",
    "lead": "We reply within one business day.",
    "form": {
      "name": "Your name", "email": "Email", "company": "Company (optional)", "message": "Message",
      "submit": "Send", "sending": "Sending…"
    },
    "successMessage": "Thanks. We'll reply within 1 business day.",
    "officeEyebrow": "OFFICE",
    "officeAddress": "Sudirman Central Business District, Jakarta 12190, Indonesia"
  }
}
```

- [ ] **Step 2: Implement (form visual, no submit — Phase 3)**

```tsx
// apps/web/src/app/[locale]/contact/page.tsx
'use client'
import { useTranslations } from 'next-intl'
import { DisplayHeading, Eyebrow, ContactForm } from '@jakartabc/ui'

export default function Contact() {
  const t = useTranslations('contact')

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

        <div>
          <ContactForm
            labels={{
              name: t('form.name'), email: t('form.email'), company: t('form.company'), message: t('form.message'),
              submit: t('form.submit'), sending: t('form.sending'),
            }}
            state="idle"
            successMessage={t('successMessage')}
            onSubmit={() => {
              // Phase 3 wires Server Action
              console.warn('ContactForm submit not yet wired — Phase 3')
            }}
          />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: e2e + commit**

```ts
for (const locale of ['en', 'id'] as const) {
  test(`contact form fields @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/contact' : '/id/contact')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('textarea[name="message"]')).toBeVisible()
  })
}
```

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
git add apps/web/src/app/[locale]/contact apps/web/messages/*.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): contact page with visual form (Phase 3 wires submit)

Two-column layout: copy + office address on left, ContactForm on right.
Submit handler stubbed; Phase 3 swaps in Server Action.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 26: Refine not-found.tsx + error.tsx

**Files:**
- Modify: `apps/web/src/app/[locale]/not-found.tsx`
- Modify: `apps/web/src/app/[locale]/error.tsx`
- Modify: `apps/web/messages/{en,id}.json` (add `notFound.*`, `error.*`)

- [ ] **Step 1: Append messages**

```json
// en.json
{
  "notFound": {
    "headline": "This page isn't here.",
    "lead": "It may have been moved, or the link is incorrect.",
    "home": "Home",
    "services": "Services",
    "insights": "Insights"
  },
  "errorPage": {
    "headline": "Something on our end isn't working.",
    "lead": "We've been notified. If urgent, email us directly.",
    "emailLabel": "hello@jakartabc.com"
  }
}
```

- [ ] **Step 2: not-found.tsx**

```tsx
// apps/web/src/app/[locale]/not-found.tsx
import { getTranslations } from 'next-intl/server'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'
import { LocalizedLink } from '@/components/LocalizedLink'

export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <section className="mx-auto max-w-editorial px-6 py-32 md:px-10 md:py-48">
      <Eyebrow>404</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">{t('headline')}</DisplayHeading>
      <p className="mt-6 max-w-prose text-body-lg text-ink-700">{t('lead')}</p>
      <ul className="mt-12 flex gap-8 text-body-md text-ochre-700">
        <li><LocalizedLink href="/" className="underline underline-offset-4">{t('home')}</LocalizedLink></li>
        <li><LocalizedLink href="/services" className="underline underline-offset-4">{t('services')}</LocalizedLink></li>
        <li><LocalizedLink href="/insights" className="underline underline-offset-4">{t('insights')}</LocalizedLink></li>
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: error.tsx**

```tsx
// apps/web/src/app/[locale]/error.tsx
'use client'
import { useTranslations } from 'next-intl'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

export default function ErrorPage({ error }: { error: Error; reset: () => void }) {
  const t = useTranslations('errorPage')
  return (
    <section className="mx-auto max-w-editorial px-6 py-32 md:px-10 md:py-48">
      <Eyebrow>500</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">{t('headline')}</DisplayHeading>
      <p className="mt-6 max-w-prose text-body-lg text-ink-700">{t('lead')}</p>
      <p className="mt-12 text-body-md">
        <a href={`mailto:${t('emailLabel')}`} className="text-ochre-700 underline underline-offset-4">{t('emailLabel')}</a>
      </p>
    </section>
  )
}
```

- [ ] **Step 4: e2e + commit**

```ts
for (const locale of ['en', 'id'] as const) {
  test(`404 page @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/this-does-not-exist' : '/id/this-does-not-exist')
    await expect(page.getByText(/page isn't here|halaman tidak/i)).toBeVisible()
  })
}
```

```bash
pnpm --filter @jakartabc/web e2e marketing.spec.ts
git add apps/web/src/app/[locale]/not-found.tsx apps/web/src/app/[locale]/error.tsx apps/web/messages/*.json apps/web/e2e/marketing.spec.ts
git commit -m "$(cat <<'EOF'
feat(web): editorial 404 + 500 pages (DS §23)

No astronauts. No dinosaurs. Quiet display headline + lead + escape
routes (Home/Services/Insights) for 404; direct email for 500.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 27: Complete bilingual messages JSON

**Files:**
- Modify: `apps/web/messages/id.json`

- [ ] **Step 1: Translate all keys added in Tasks 1-26**

Every `en.json` key added so far must have an `id.json` counterpart. Translator owns final copy. Indicative ID translations:

```json
// apps/web/messages/id.json (full file, structured to match en.json)
{
  "nav": {
    "services": "Layanan",
    "insights": "Insight",
    "about": "Tentang",
    "pricing": "Harga",
    "cta": "Jadwalkan konsultasi"
  },
  "footer": { /* same as en for address/email/licenses if intended same */ },
  "home": {
    "eyebrow": "INVESTASI ASING LANGSUNG · INDONESIA",
    "headline": "Dirikan PT PMA di Indonesia. Tanpa menebak.",
    "lead": "Pendirian perusahaan kepemilikan asing, izin sektoral, dan kepatuhan berkelanjutan — ditangani tim Jakarta yang sudah melakukannya 400+ kali.",
    "primaryCta": "Jadwalkan panggilan 30 menit",
    "secondaryCta": "Lihat prosesnya",
    "servicesEyebrow": "YANG KAMI KERJAKAN",
    "servicesRead": "Baca",
    "services": [
      { "slug": "pt-pma-setup", "title": "Pendirian PT PMA", "desc": "Pendirian LLC milik asing, end-to-end.", "timeline": "4–6 minggu" },
      { "slug": "sector-licensing", "title": "Perizinan Sektoral", "desc": "OSS, KBLI, izin spesifik sektor.", "timeline": "2–8 minggu" },
      { "slug": "tax-accounting", "title": "Pajak & Akuntansi", "desc": "Pelaporan pajak bulanan, payroll, laporan tahunan.", "timeline": "berjalan" },
      { "slug": "investor-kitas", "title": "KITAS Investor", "desc": "Izin tinggal untuk pemegang saham dan direktur asing.", "timeline": "3–4 minggu" }
    ],
    "quote": "Mereka mengurus filing BKPM dalam dua minggu. Tidak ada biaya kejutan di akhir.",
    "quoteAuthor": "Maria Tanaka",
    "quoteRole": "Founder, Solstice KK"
  },
  "services": {
    "eyebrow": "YANG KAMI KERJAKAN",
    "headline": "Investasi asing langsung di Indonesia, end-to-end.",
    "lead": "Empat layanan inti. Transparansi editorial: apa yang termasuk, berapa lama, berapa biayanya.",
    "readLabel": "Baca",
    "list": [ /* same shape as en, ID copy */ ]
  },
  "serviceDetail": {
    "tocHeading": "Di halaman ini",
    "ctaBook": "Jadwalkan panggilan 30 menit",
    "overview": "GAMBARAN",
    "whoFor": "UNTUK SIAPA",
    "requirements": "PERSYARATAN",
    "timeline": "TIMELINE",
    "cost": "BIAYA",
    "faq": "TANYA JAWAB",
    "regulationsCited": "REGULASI YANG DIRUJUK",
    "timelineLabels": { "we": "Kami tangani", "joint": "Bersama", "you": "Anda sediakan" }
  },
  "pricing": {
    "eyebrow": "BIAYA",
    "headline": "Harga transparan. Tanpa biaya tersembunyi.",
    "lead": "Biaya pemerintah dan biaya kami, baris per baris. Estimasi per Mei 2026.",
    "tableHeaders": { "service": "Layanan", "govFee": "Biaya Pemerintah", "ourFee": "Biaya Kami", "total": "Total" },
    "starter": "Paket Starter",
    "footnote": "Estimasi per Mei 2026. Tanpa biaya tersembunyi. Kuotasi khusus untuk sektor teregulasi.",
    "ctaQuote": "Minta kuotasi khusus"
  },
  "about": {
    "eyebrow": "TENTANG",
    "headline": "Boutique Jakarta. Tenang, spesifik, akuntabel.",
    "lead": "Kami mendirikan Jakarta Business Center untuk menghadirkan kejelasan editorial pada investasi asing langsung di Indonesia.",
    "founderEyebrow": "DARI FOUNDER",
    "founderNote": "Saat saya mendirikan Jakarta BC tahun 2019, sudah selusin kawan saya menyerah dari rencana usaha di Indonesia karena kejutan perizinan yang sebetulnya bisa dihindari. Premis firm ini sederhana: beri tahu investor apa yang sebenarnya dibutuhkan, dengan angka dan timeline nyata. Diah Putri, Founder.",
    "teamEyebrow": "TIM",
    "team": [
      { "name": "Diah Putri", "role": "Founder, Konsultan Senior" },
      { "name": "Andi Wirawan", "role": "Lead Pajak & Akuntansi" },
      { "name": "Maya Hadi", "role": "Lead Perizinan Sektoral" }
    ],
    "licensesEyebrow": "LISENSI & REGISTRASI",
    "licenses": [
      "Konsultan Berlisensi BKPM — Reg 001/2025",
      "Anggota PERADI Jakarta",
      "Firma terdaftar ICAI"
    ]
  },
  "insights": {
    "eyebrow": "INSIGHT",
    "headline": "Editorial tentang FDI Indonesia, dengan referensi.",
    "lead": "Artikel long-form tentang regulasi, sektor, dan realitas operasional. Bukan listicle SEO.",
    "empty": "Belum ada artikel. Berlangganan via footer untuk dapat notifikasi saat kami terbitkan."
  },
  "contact": {
    "eyebrow": "KONTAK",
    "headline": "Sampaikan kebutuhan Anda.",
    "lead": "Kami balas dalam 1 hari kerja.",
    "form": {
      "name": "Nama", "email": "Email", "company": "Perusahaan (opsional)", "message": "Pesan",
      "submit": "Kirim", "sending": "Mengirim…"
    },
    "successMessage": "Terima kasih. Kami balas dalam 1 hari kerja.",
    "officeEyebrow": "KANTOR",
    "officeAddress": "Sudirman Central Business District, Jakarta 12190, Indonesia"
  },
  "notFound": {
    "headline": "Halaman tidak ditemukan.",
    "lead": "Mungkin sudah dipindahkan, atau tautannya tidak benar.",
    "home": "Beranda",
    "services": "Layanan",
    "insights": "Insight"
  },
  "errorPage": {
    "headline": "Ada yang tidak berjalan di sisi kami.",
    "lead": "Kami sudah dapat notifikasi. Bila mendesak, email langsung.",
    "emailLabel": "hello@jakartabc.com"
  }
}
```

- [ ] **Step 2: Validate JSON parses + commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('apps/web/messages/en.json'))"
node -e "JSON.parse(require('fs').readFileSync('apps/web/messages/id.json'))"
git add apps/web/messages/id.json
git commit -m "$(cat <<'EOF'
content(i18n): complete ID locale for all marketing copy

Bilingual parity achieved for nav/footer/home/services/serviceDetail/
pricing/about/insights/contact/notFound/errorPage. Translator owns
final wording; this commit is structural ID-shape baseline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 28: State matrix Vitest sweep

**Files:**
- Modify: `packages/ui/src/components/{Button,Input,...}.test.tsx` — add explicit 7-state tests where missing

- [ ] **Step 1: Audit each interactive component for state coverage**

For each interactive in `packages/ui`: Button, Input, Textarea (if separate), Select (if separate), NavBar, MobileMenu, LangToggle, BookingForm, ContactForm — verify Vitest tests cover the relevant subset of 7 states (DS §20):
- default, hover (via class assertion or `:hover` style), focus (via `fireEvent.focus`), active (via `:active` class), disabled (via prop), loading (via prop), error (via prop where applicable)

Some states are visual-only (hover, active) and best tested via Playwright visual regression — note that in the task and skip Vitest where appropriate.

- [ ] **Step 2: Add missing test for Button.loading state if Phase 0 missed it**

```tsx
// packages/ui/src/components/Button.test.tsx (append)
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

it('shows loading state with mono char when loading=true', () => {
  render(<Button loading>Send</Button>)
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByRole('button')).toBeDisabled()
})
```

If `Button` from Phase 0 doesn't yet have `loading` prop, add it now:

```tsx
// packages/ui/src/components/Button.tsx (extend props)
loading?: boolean
// ...inside render:
{loading ? (
  <span aria-hidden className="font-mono animate-spin-slow">·</span>
) : null}
{children}
// + aria-busy={loading} + disabled={disabled || loading} on the underlying element
```

Define `animate-spin-slow` in `packages/ui/tailwind-preset.ts`:

```ts
extend: {
  // ...existing
  keyframes: { 'spin-slow': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } },
  animation: { 'spin-slow': 'spin-slow 1.2s linear infinite' },
}
```

- [ ] **Step 3: Run full Vitest suite**

```bash
pnpm -w test
```

Expected: all tests pass across `packages/ui` and `apps/web`.

- [ ] **Step 4: Commit**

```bash
git add packages/ui apps/web
git commit -m "$(cat <<'EOF'
test(ui): state-matrix coverage sweep per DS §20

Audited each interactive for default/hover/focus/active/disabled/
loading/error. Added Button.loading prop with aria-busy and mono
spinner per DS form-loading spec.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 29: A11y e2e (axe + bilingual)

**Files:**
- Create: `apps/web/e2e/a11y.spec.ts`
- Modify: `apps/web/playwright.config.ts` (already configured Phase 0 — verify projects include `a11y.spec.ts`)
- Modify: `apps/web/package.json` (add `@axe-core/playwright`)

- [ ] **Step 1: Install axe**

```bash
pnpm --filter @jakartabc/web add -D @axe-core/playwright
```

- [ ] **Step 2: Implement a11y spec**

```ts
// apps/web/e2e/a11y.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = ['', '/services', '/services/pt-pma-setup', '/pricing', '/about', '/insights', '/contact']

for (const locale of ['en', 'id'] as const) {
  for (const path of PAGES) {
    test(`a11y ${locale}${path}`, async ({ page }) => {
      const url = locale === 'en' ? `${path || '/'}` : `/id${path}`
      await page.goto(url)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  }
}
```

- [ ] **Step 3: Run a11y e2e + commit**

```bash
pnpm --filter @jakartabc/web e2e a11y.spec.ts
```

Fix any violations found (commonly: missing `alt`, missing `lang` attr on html, missing semantic landmarks).

```bash
git add apps/web/e2e/a11y.spec.ts apps/web/package.json
git commit -m "$(cat <<'EOF'
test(a11y): axe-core suite over all marketing pages × locales

WCAG 2 A + AA tagging. Fails build on any violation. Locale toggle,
focus state visibility, semantic landmarks, alt text covered.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 30: Mobile-responsive e2e

**Files:**
- Create: `apps/web/e2e/mobile-responsive.spec.ts`

- [ ] **Step 1: Implement**

```ts
// apps/web/e2e/mobile-responsive.spec.ts
import { test, expect, devices } from '@playwright/test'

const PAGES = ['', '/services', '/services/pt-pma-setup', '/pricing', '/about', '/insights', '/contact']

test.use({ ...devices['iPhone 14'] })

for (const locale of ['en', 'id'] as const) {
  for (const path of PAGES) {
    test(`mobile ${locale}${path} no horizontal scroll`, async ({ page }) => {
      await page.goto(locale === 'en' ? path || '/' : `/id${path}`)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
}

test('mobile menu opens and closes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /open menu/i }).click()
  await expect(page.getByRole('dialog', { name: /menu/i })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /menu/i })).toBeHidden()
})
```

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter @jakartabc/web e2e mobile-responsive.spec.ts
git add apps/web/e2e/mobile-responsive.spec.ts
git commit -m "$(cat <<'EOF'
test(mobile): responsive spec across pages × locales

Asserts no horizontal scroll at iPhone 14 viewport for every marketing
page. Mobile menu open/close via Escape.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 31: Lighthouse CI budgets

**Files:**
- Create: `apps/web/lighthouserc.json`
- Create: `.github/workflows/lighthouse.yml`

- [ ] **Step 1: Lighthouse config**

```json
// apps/web/lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm --filter @jakartabc/web start",
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/services",
        "http://localhost:3000/services/pt-pma-setup",
        "http://localhost:3000/pricing",
        "http://localhost:3000/about",
        "http://localhost:3000/insights",
        "http://localhost:3000/contact",
        "http://localhost:3000/id",
        "http://localhost:3000/id/services"
      ],
      "numberOfRuns": 1
    },
    "assert": {
      "assertions": {
        "categories:performance":  ["error", { "minScore": 0.9 }],
        "categories:accessibility":["error", { "minScore": 0.95 }],
        "categories:best-practices":["error", { "minScore": 0.95 }],
        "largest-contentful-paint":["error", { "maxNumericValue": 1500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
        "interactive":             ["error", { "maxNumericValue": 2500 }]
      }
    }
  }
}
```

- [ ] **Step 2: GitHub Actions workflow**

```yaml
# .github/workflows/lighthouse.yml
name: lighthouse
on: [pull_request]
jobs:
  lh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @jakartabc/web build
      - run: pnpm dlx @lhci/cli autorun --config=apps/web/lighthouserc.json
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lighthouserc.json .github/workflows/lighthouse.yml
git commit -m "$(cat <<'EOF'
ci(lighthouse): enforce DS §22 performance budgets on PRs

LCP < 1.5s, CLS < 0.05, perf ≥ 0.9, a11y ≥ 0.95. Fails PR on regression.
Audits 9 URLs covering both locales and key page types.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 32: Anti-AI checklist doc + PR template

**Files:**
- Create: `docs/anti-ai-checklist.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Checklist doc**

```markdown
<!-- docs/anti-ai-checklist.md -->
# Anti-AI / Anti-SaaS Visual Checklist

Audit every PR that touches marketing UI against the design-system.md §11 list. Reject (and fix) if any item below is "no".

- [ ] No gradient backgrounds (hero, button, section bg)
- [ ] No glassmorphism / frosted blur cards
- [ ] No abstract 3D blob / fluid shape decoration
- [ ] No floating screenshot with tilt 3D
- [ ] No "Powered by AI" badge or hero copy "Intelligent / Smart / AI-driven"
- [ ] No dark mode toggle + neon accent
- [ ] No bento grid asymmetric viral pattern
- [ ] No Notion/Linear-style illustration
- [ ] No emoji in headlines or buttons
- [ ] No border radius >12px anywhere
- [ ] No fast-spinning "trusted by" logo carousel
- [ ] No AI-generated profile photos or hero images
- [ ] Solid surfaces, palette restrained (≤3 core colors per viewport)
- [ ] Serif headline + grotesk body
- [ ] Authentic Jakarta photography (when present)
- [ ] Whitespace generous (≥96px between sections desktop)
- [ ] Concrete numbers/dates in copy (no "world-class", no "leading")
- [ ] Eyebrow label uppercase tracked before display headings
- [ ] Hairline rules > drop-shadows
- [ ] Underline inline links (classic, confident)
```

- [ ] **Step 2: PR template**

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->
## What
<!-- 1-2 sentences -->

## Why
<!-- motivation -->

## Test plan
- [ ] Vitest unit pass
- [ ] Playwright e2e pass (`marketing.spec.ts`, `a11y.spec.ts`, `mobile-responsive.spec.ts`)
- [ ] Lighthouse CI pass (DS §22 budgets)
- [ ] Anti-AI checklist reviewed (`docs/anti-ai-checklist.md`) — paste any "no" justification below
- [ ] Bilingual (EN + ID) parity verified for any new copy

## Anti-AI checklist deviations
<!-- if any item was knowingly violated, justify here -->
```

- [ ] **Step 3: Commit**

```bash
git add docs/anti-ai-checklist.md .github/PULL_REQUEST_TEMPLATE.md
git commit -m "$(cat <<'EOF'
docs: anti-AI visual checklist + PR template enforcing reviews

DS §11 list as a per-PR checklist. PR template binds the test plan
(unit/e2e/lighthouse) and bilingual parity check.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 33: Final commit + tag `phase-1-marketing-complete`

- [ ] **Step 1: Run full validation**

```bash
pnpm -w lint && pnpm -w typecheck && pnpm -w test && pnpm --filter @jakartabc/web e2e
```

Expected: all green.

- [ ] **Step 2: Build production once**

```bash
pnpm --filter @jakartabc/web build
```

Expected: successful build, bundle analyzer report shows initial JS gzipped <100kb.

- [ ] **Step 3: Tag**

```bash
git tag -a phase-1-marketing-complete -m "Phase 1: 7 bilingual marketing pages + full packages/ui inventory"
git log --oneline phase-0-foundation-complete..phase-1-marketing-complete | wc -l
```

- [ ] **Step 4: Deploy to staging**

```bash
ssh deploy@staging-vps
cd /opt/jakartabc.com
git fetch --tags
git checkout phase-1-marketing-complete
docker compose pull && docker compose up -d --build web
```

Verify `https://staging.jakartabc.com` shows the Home page (EN) and `https://staging.jakartabc.com/id` shows ID; click through to each page; mobile menu opens; lang toggle preserves path.

- [ ] **Step 5: Push tag**

```bash
git push origin phase-1-marketing-complete
```

---

## Open questions surfaced during Phase 1

1. **Editorial stock asset selection** (spec §11 Open Item) — Phase 1 ships with `/images/founder-signature.svg` placeholder + no hero photo. Brand/Content owners must confirm selection before production launch.
2. **Real partner contact data** — `ContactBlock` hardcodes `Diah Putri / diah@jakartabc.com / +62-21-555-1234`. Ops owns final names + numbers.
3. **Sales WhatsApp number** — currently a placeholder; depends on Ops decision (Phase 3 also uses it for `SALES_EMAIL`/WA fallback).
4. **License numbers + bar memberships** — placeholders in About page; Legal owns final values.
5. **ID translations** — Task 27 ships indicative ID copy. Translator must own production-grade revision before launch.
6. **Pricing numbers** — MDX frontmatter uses indicative values. Ops + Legal own final numbers (Open Item spec §11).
7. **Author signature SVG vs scan** — SVG placeholder; replace with handwritten scan (DS §19.7 trust signal) before launch.

---

## Phase 1 → Phase 2 handoff notes

What Phase 2 inherits:
- Full `packages/ui` component inventory + state matrix tests
- 7 marketing routes bilingual + e2e
- MDX-based service detail at `/services/[slug]` reading from `apps/web/content/services/*.mdx`
- Insights list at `/insights` with empty state
- Anti-AI checklist + PR template
- Lighthouse CI budget gate

What Phase 2 will change:
- Replace MDX service content with Payload `Services` collection (loader swap in `app/[locale]/services/[slug]/page.tsx` + `pricing/page.tsx`)
- Replace empty Insights list with Payload-driven list + detail pages
- Add `NavMenu` + `Footer` globals to Payload, swap hardcoded translations for Payload-managed copy where the editor needs control
