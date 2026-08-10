'use client'

import * as React from 'react'

import { cn } from '../lib/cn'
import { LangToggle, type LocaleCode } from './LangToggle'

export type MobileMenuLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

export type MobileMenuItem = {
  label: string
  href: string
}

export type MobileMenuCta = {
  label: string
  href: string
}

export type MobileMenuLabels = {
  dialog: string
  close: string
  navigation: string
}

export type MobileMenuProps = {
  open: boolean
  onClose: () => void
  brand: string
  items: MobileMenuItem[]
  cta: MobileMenuCta
  locale: LocaleCode
  onLocaleChange: (next: LocaleCode) => void
  triggerRef?: React.RefObject<HTMLElement | null>
  labels?: MobileMenuLabels
  className?: string
  Link?: React.ComponentType<MobileMenuLinkProps>
}

function DefaultLink({ href, className, children, onClick }: MobileMenuLinkProps) {
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  )
}

const menuLink =
  'block font-display text-display-md text-ink-900 transition-colors duration-fast ease-out ' +
  'hover:text-ochre-700 active:text-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-ochre-600'

const ctaLink =
  'inline-flex w-full items-center justify-center rounded-sm bg-ochre-600 px-24 py-12 ' +
  'font-body text-body-md text-bone-50 transition-colors duration-fast ease-out hover:bg-ochre-700 active:bg-ochre-700 active:translate-y-px ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true',
  )
}

function defaultLabels(locale: LocaleCode): MobileMenuLabels {
  return locale === 'id'
    ? { dialog: 'Menu seluler', close: 'Tutup menu', navigation: 'Navigasi seluler' }
    : { dialog: 'Mobile menu', close: 'Close menu', navigation: 'Mobile navigation' }
}

export function MobileMenu({
  open,
  onClose,
  brand,
  items,
  cta,
  locale,
  onLocaleChange,
  triggerRef,
  labels,
  className,
  Link = DefaultLink,
}: MobileMenuProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const onCloseRef = React.useRef(onClose)
  const localizedLabels = labels ?? defaultLabels(locale)

  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  React.useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const trigger = triggerRef?.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusable = getFocusableElements(dialog)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      if (focusable.length === 1) {
        event.preventDefault()
        focusable[0]?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const focusIsOutside = !(active instanceof Node) || !dialog.contains(active)

      if (event.shiftKey && (active === first || focusIsOutside)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (active === last || focusIsOutside)) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    const initialFocus = closeButtonRef.current ?? (dialog ? getFocusableElements(dialog)[0] : null)
    const focusTarget = initialFocus ?? dialog
    focusTarget?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [open, triggerRef])

  if (!open) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={localizedLabels.dialog}
      tabIndex={-1}
      className={cn('fixed inset-0 z-[100] bg-bone-50 text-ink-900 md:hidden', className)}
    >
      <div className="flex h-64 items-center justify-between border-b border-ink-900/[0.08] px-6">
        <span className="font-display text-2xl text-ink-900">{brand}</span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={localizedLabels.close}
          className="inline-flex size-10 items-center justify-center text-ink-900 transition-colors duration-fast ease-out hover:text-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
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
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <nav aria-label={localizedLabels.navigation} className="px-6 pt-12">
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.href} className="border-b border-ink-900/[0.08] py-4">
              <Link href={item.href} className={menuLink} onClick={onClose}>
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
        <Link href={cta.href} className={ctaLink} onClick={onClose}>
          {cta.label} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}
