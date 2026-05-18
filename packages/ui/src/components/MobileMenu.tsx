'use client'

import * as React from 'react'

import { cn } from '../lib/cn'
import { LangToggle, type LocaleCode } from './LangToggle'

export type MobileMenuLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

export type MobileMenuItem = {
  label: string
  href: string
}

export type MobileMenuCta = {
  label: string
  href: string
}

export type MobileMenuProps = {
  open: boolean
  onClose: () => void
  brand: string
  items: MobileMenuItem[]
  cta: MobileMenuCta
  locale: LocaleCode
  onLocaleChange: (next: LocaleCode) => void
  className?: string
  Link?: React.ComponentType<MobileMenuLinkProps>
}

function DefaultLink({ href, className, children }: MobileMenuLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

const menuLink =
  'block font-display text-display-md text-ink-900 transition-colors duration-fast ease-out ' +
  'hover:text-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-ochre-600'

const ctaLink =
  'inline-flex w-full items-center justify-center rounded-sm bg-ochre-600 px-24 py-12 ' +
  'font-body text-body-md text-bone-50 transition-colors duration-fast ease-out hover:bg-ochre-700 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600'

export function MobileMenu({
  open,
  onClose,
  brand,
  items,
  cta,
  locale,
  onLocaleChange,
  className,
  Link = DefaultLink,
}: MobileMenuProps) {
  React.useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className={cn('fixed inset-0 z-[100] bg-bone-50 text-ink-900 md:hidden', className)}
    >
      <div className="flex h-64 items-center justify-between border-b border-ink-900/[0.08] px-6">
        <span className="font-display text-2xl text-ink-900">{brand}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="inline-flex size-10 items-center justify-center text-ink-900 transition-colors duration-fast ease-out hover:text-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <nav aria-label="Mobile navigation" className="px-6 pt-12">
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.href} className="border-b border-ink-900/[0.08] py-4">
              <Link href={item.href} className={menuLink}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-6 pt-12">
        <LangToggle current={locale} onChange={onLocaleChange} className="text-ink-700" />
      </div>

      <div className="px-6 pt-8">
        <Link href={cta.href} className={ctaLink}>
          {cta.label} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}
