'use client'

import * as React from 'react'

import { cn } from '../lib/cn'

export type TocItem = {
  id: string
  label: string
}

export type StickyTOCLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

export type StickyTOCProps = {
  heading: string
  items: TocItem[]
  primaryCta: { label: string; href: string }
  activeId?: string
  className?: string
  Link?: React.ComponentType<StickyTOCLinkProps>
} & Omit<React.ComponentPropsWithoutRef<'aside'>, 'className' | 'children'>

function DefaultLink({ href, className, children }: StickyTOCLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

export function StickyTOC({
  heading,
  items,
  primaryCta,
  activeId,
  className,
  Link = DefaultLink,
  ...rest
}: StickyTOCProps) {
  return (
    <aside className={cn('sticky top-24 hidden w-[200px] flex-shrink-0 md:block', className)} {...rest}>
      <p className="mb-4 text-eyebrow uppercase tracking-[0.08em] text-ink-700">{heading}</p>
      <ul className="space-y-3" aria-label={heading}>
        {items.map((item) => {
          const isActive = activeId === item.id

          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  'block text-body-md underline-offset-4 transition-colors duration-fast hover:text-ink-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600',
                  isActive ? 'text-ink-900' : 'text-ink-500',
                )}
                aria-current={isActive ? 'location' : undefined}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
      <div className="mt-10">
        <Link
          href={primaryCta.href}
          className="inline-flex w-full items-center justify-center gap-8 rounded-sm bg-ochre-600 px-24 py-12 font-body text-body-md text-bone-50 transition-colors duration-fast ease-out hover:bg-ochre-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
        >
          {primaryCta.label} →
        </Link>
      </div>
    </aside>
  )
}

export function useScrollSpy(ids: string[], rootMargin = '-30% 0px -60% 0px') {
  const idsKey = ids.join('|')
  const [activeId, setActiveId] = React.useState<string | undefined>(ids[0])

  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const sectionIds = idsKey.split('|').filter(Boolean)
    const observers = sectionIds.map((id) => {
      const el = document.getElementById(id)

      if (!el) {
        return null
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setActiveId(id)
          }
        },
        { rootMargin, threshold: 0 },
      )

      observer.observe(el)
      return observer
    })

    return () => {
      observers.forEach((observer) => observer?.disconnect())
    }
  }, [idsKey, rootMargin])

  return activeId
}
