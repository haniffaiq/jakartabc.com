import * as React from 'react'

import { cn } from '../lib/cn'

export type EditorialListItem = {
  slug: string
  title: string
  desc: string
  timeline: string
}

export type EditorialListLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
  'aria-label'?: string
}

export type EditorialListProps = {
  items: EditorialListItem[]
  hrefPrefix: string
  readLabel: string
  className?: string
  Link?: React.ComponentType<EditorialListLinkProps>
} & Omit<React.ComponentPropsWithoutRef<'ol'>, 'className' | 'children'>

function DefaultLink({ href, className, children, 'aria-label': ariaLabel }: EditorialListLinkProps) {
  return (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  )
}

function itemHref(prefix: string, slug: string) {
  return `${prefix.replace(/\/$/, '')}/${slug}`
}

export function EditorialList({
  items,
  hrefPrefix,
  readLabel,
  className,
  Link = DefaultLink,
  ...rest
}: EditorialListProps) {
  return (
    <ol className={cn('mx-auto max-w-container px-6 md:px-10', className)} {...rest}>
      {items.map((item, index) => {
        const titleId = `editorial-list-${item.slug}`

        return (
          <li key={item.slug} className="py-12">
            <div className="grid grid-cols-1 items-baseline gap-y-4 md:grid-cols-[80px_1fr_auto] md:gap-x-8">
              <span className="font-mono text-mono-sm tabular-nums text-ink-500" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 id={titleId} className="font-display text-display-md text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-prose text-body-md text-ink-700">{item.desc}</p>
              </div>
              <span className="font-mono text-mono-sm tabular-nums text-ink-500">{item.timeline}</span>
            </div>
            <div className="mt-6 flex justify-end">
              <Link
                href={itemHref(hrefPrefix, item.slug)}
                className="text-body-md text-ochre-700 underline-offset-4 hover:underline"
                aria-label={`${readLabel}: ${item.title}`}
              >
                {readLabel} →
              </Link>
            </div>
            {index < items.length - 1 ? <div className="mt-12 border-t border-ink-900/[0.08]" /> : null}
          </li>
        )
      })}
    </ol>
  )
}
