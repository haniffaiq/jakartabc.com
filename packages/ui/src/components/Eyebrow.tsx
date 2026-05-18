import * as React from 'react'

import { cn } from '../lib/cn'

export type EyebrowProps = React.HTMLAttributes<HTMLSpanElement>

export function Eyebrow({ className, children, ...rest }: EyebrowProps) {
  return (
    <span
      className={cn(
        'inline-block font-body text-eyebrow font-medium uppercase tracking-[0.08em] text-ink-700',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
