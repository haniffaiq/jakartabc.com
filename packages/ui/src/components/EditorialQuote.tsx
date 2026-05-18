import * as React from 'react'

import { cn } from '../lib/cn'

export type EditorialQuoteProps = {
  quote: React.ReactNode
  author: string
  role: string
  className?: string
} & Omit<React.ComponentPropsWithoutRef<'figure'>, 'className' | 'children'>

export function EditorialQuote({ quote, author, role, className, ...rest }: EditorialQuoteProps) {
  return (
    <figure className={cn('mx-auto max-w-editorial px-6 py-16 md:px-10', className)} {...rest}>
      <blockquote className="font-display text-display-md leading-[1.2] text-ink-900">{quote}</blockquote>
      <figcaption className="mt-6 text-body-sm text-ink-700">
        <span className="font-medium text-ink-900">{author}</span>
        <span aria-hidden="true"> · </span>
        <span>{role}</span>
      </figcaption>
    </figure>
  )
}
