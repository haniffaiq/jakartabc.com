import * as React from 'react'

import { cn } from '../lib/cn'

export type HeroLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

export type HeroAction = {
  label: string
  href: string
}

export type HeroProps = {
  eyebrow: string
  headline: React.ReactNode
  lead: React.ReactNode
  primary: HeroAction
  secondary?: HeroAction
  className?: string
  Link?: React.ComponentType<HeroLinkProps>
} & Omit<React.ComponentPropsWithoutRef<'section'>, 'className' | 'children'>

function DefaultLink({ href, className, children }: HeroLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

const primaryCta =
  'inline-flex items-center justify-center rounded-sm bg-ochre-600 px-24 py-12 font-body text-body-md ' +
  'text-bone-50 transition-colors duration-fast ease-out hover:bg-ochre-700 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600'

const secondaryCta =
  'inline-flex items-center justify-center rounded-sm px-8 py-4 font-body text-body-md text-ink-900 ' +
  'underline-offset-4 transition-colors duration-fast ease-out hover:text-ochre-700 hover:underline ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600'

export function Hero({
  eyebrow,
  headline,
  lead,
  primary,
  secondary,
  className,
  Link = DefaultLink,
  ...rest
}: HeroProps) {
  return (
    <section className={cn('px-6 py-32 md:px-10 md:py-40', className)} {...rest}>
      <div className="mx-auto max-w-editorial">
        <p className="font-body text-eyebrow uppercase tracking-[0.08em] text-ink-700">{eyebrow}</p>
        <h1 className="mt-6 max-w-[9ch] font-display text-display-xl text-ink-900">{headline}</h1>
        <p className="mt-8 max-w-prose text-body-lg leading-relaxed text-ink-700">{lead}</p>
        <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
          <Link href={primary.href} className={primaryCta}>
            {primary.label} <span aria-hidden="true">→</span>
          </Link>
          {secondary ? (
            <Link href={secondary.href} className={secondaryCta}>
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
