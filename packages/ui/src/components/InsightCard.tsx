import * as React from 'react'

import { cn } from '../lib/cn'

export type InsightCardLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

export type InsightCardProps = {
  category: string
  date: string
  readTime: number
  title: string
  lead: string
  href: string
  className?: string
  Link?: React.ComponentType<InsightCardLinkProps>
} & Omit<React.ComponentPropsWithoutRef<'article'>, 'className' | 'children' | 'title'>

function DefaultLink({ href, className, children }: InsightCardLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function InsightCard({
  category,
  date,
  readTime,
  title,
  lead,
  href,
  className,
  Link = DefaultLink,
  ...rest
}: InsightCardProps) {
  return (
    <article className={cn('border-t border-ink-900/[0.08] py-10', className)} {...rest}>
      <div className="flex flex-wrap items-center gap-2 text-eyebrow uppercase tracking-[0.08em] text-ink-700">
        <span>{category}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={date}>{formatDate(date)}</time>
        <span aria-hidden="true">·</span>
        <span>{readTime} min read</span>
      </div>
      <h3 className="mt-4 font-display text-display-md text-ink-900">
        <Link href={href} className="underline-offset-4 hover:underline">
          {title}
        </Link>
      </h3>
      <p className="mt-3 max-w-prose text-body-md text-ink-700">{lead}</p>
    </article>
  )
}
