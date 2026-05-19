import * as React from 'react'

import { cn } from '../lib/cn'

export type FooterBlockLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

export type FooterBlockLegalLink = {
  label: string
  href: string
}

export type FooterBlockProps = {
  brand: string
  address: string[]
  email: string
  licenses: string[]
  legalLinks?: FooterBlockLegalLink[]
  variant?: 'light' | 'dark'
  className?: string
  Link?: React.ComponentType<FooterBlockLinkProps>
} & Omit<React.ComponentPropsWithoutRef<'footer'>, 'className' | 'children'>

function DefaultLink({ href, className, children }: FooterBlockLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

const focusLink =
  'underline-offset-4 transition-colors duration-fast ease-out hover:underline ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600'

export function FooterBlock({
  brand,
  address,
  email,
  licenses,
  legalLinks = [],
  variant = 'light',
  className,
  Link = DefaultLink,
  ...rest
}: FooterBlockProps) {
  const dark = variant === 'dark'

  return (
    <footer
      className={cn(
        'border-t',
        dark
          ? 'border-bone-100/10 bg-navy-900 text-bone-100'
          : 'border-ink-900/[0.08] bg-bone-100 text-ink-900',
        className,
      )}
      {...rest}
    >
      <div className="mx-auto grid max-w-container grid-cols-1 gap-32 px-24 py-64 md:grid-cols-4 md:gap-48 md:px-48 md:py-96">
        <div>
          <span
            className={cn(
              'font-display text-xl font-extrabold uppercase tracking-[0.08em]',
              dark ? 'text-bone-50' : 'text-navy-900',
            )}
          >
            {brand}
          </span>
        </div>

        <div>
          <p className="mb-3 font-body text-eyebrow uppercase tracking-[0.08em] opacity-70">
            Office
          </p>
          <address className="space-y-1 text-body-md leading-relaxed not-italic">
            {address.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </address>
        </div>

        <div>
          <p className="mb-3 font-body text-eyebrow uppercase tracking-[0.08em] opacity-70">
            Contact
          </p>
          <a
            href={`mailto:${email}`}
            className={cn(
              'text-body-md',
              focusLink,
              dark ? 'hover:text-navy-100' : 'hover:text-navy-700',
            )}
          >
            {email}
          </a>
        </div>

        <div>
          <p className="mb-3 font-body text-eyebrow uppercase tracking-[0.08em] opacity-70">
            Licenses
          </p>
          <ul className="space-y-1 text-body-sm leading-relaxed">
            {licenses.map((license) => (
              <li key={license}>{license}</li>
            ))}
          </ul>
        </div>
      </div>

      {legalLinks.length > 0 ? (
        <div
          className={cn(
            'mx-auto flex max-w-container flex-col gap-16 px-24 py-24 text-body-sm md:flex-row md:items-center md:justify-between md:px-48',
            dark ? 'border-t border-bone-100/10' : 'border-t border-ink-900/[0.08]',
          )}
        >
          <span className="opacity-70">
            © {new Date().getFullYear()} {brand}
          </span>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(focusLink, dark ? 'hover:text-navy-100' : 'hover:text-navy-700')}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </footer>
  )
}
