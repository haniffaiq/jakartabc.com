import * as React from 'react'

import { cn } from '../lib/cn'

export type RuleDividerProps = {
  weight?: 'soft' | 'firm'
  className?: string
} & Omit<React.ComponentPropsWithoutRef<'hr'>, 'className'>

export function RuleDivider({ weight = 'soft', className, ...rest }: RuleDividerProps) {
  return (
    <hr
      className={cn(
        'border-0 border-t',
        weight === 'soft' ? 'border-ink-900/[0.08]' : 'border-ink-900/15',
        className,
      )}
      {...rest}
    />
  )
}
