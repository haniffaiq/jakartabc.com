'use client'

import * as React from 'react'
import { cn } from '../lib/cn'

export type NavBarItem = { label: string; href: string }
export type NavBarCta = { label: string; href: string }
export type NavBarLinkProps = { href: string; className?: string; children: React.ReactNode }

export type NavBarProps = {
  brand: string
  items: NavBarItem[]
  cta: NavBarCta
  locale: 'en' | 'id'
  onLocaleChange: (next: 'en' | 'id') => void
  onMobileOpen: () => void
  Link?: React.ComponentType<NavBarLinkProps>
  className?: string
}

function DefaultLink({ href, className, children }: NavBarLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

export function NavBar({
  brand,
  items,
  cta,
  locale,
  onLocaleChange,
  onMobileOpen,
  Link = DefaultLink,
  className,
}: NavBarProps) {
  const [scrolled, setScrolled] = React.useState(false)
  const next: 'en' | 'id' = locale === 'en' ? 'id' : 'en'

  React.useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sticky top-0 z-50 h-[64px] bg-bone-50 transition-colors duration-fast md:h-[72px]',
        scrolled ? 'border-b border-ink-900/[0.08]' : 'border-b border-transparent',
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-container items-center justify-between px-6 md:px-10">
        <Link
          href="/"
          className="font-display text-2xl text-ink-900 underline-offset-4 hover:text-ochre-700 hover:underline active:text-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
        >
          {brand}
        </Link>

        <ul className="hidden gap-8 md:flex">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-body-md text-ink-900 underline-offset-4 hover:text-ochre-700 hover:underline active:text-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 md:flex">
          <button
            type="button"
            onClick={() => onLocaleChange(next)}
            aria-label={`Switch to ${next === 'id' ? 'Indonesian' : 'English'}`}
            className="text-eyebrow uppercase tracking-[0.08em] text-ink-700 hover:text-ink-900 active:text-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
          >
            EN · ID
          </button>
          <Link
            href={cta.href}
            className="inline-flex items-center justify-center rounded-sm bg-ochre-600 px-24 py-12 font-body text-body-md text-bone-50 transition-colors duration-fast hover:bg-ochre-700 active:bg-ochre-700 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
          >
            {cta.label}
          </Link>
        </div>

        <button
          type="button"
          aria-label="Open menu"
          onClick={onMobileOpen}
          className="text-ink-900 hover:text-ochre-700 active:text-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600 md:hidden"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
