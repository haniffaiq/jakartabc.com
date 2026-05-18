import * as React from 'react'

import { cn } from '../lib/cn'

type CardProps<E extends React.ElementType = 'article'> = {
  as?: E
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'className' | 'children'>

export function Card<E extends React.ElementType = 'article'>({
  as,
  className,
  children,
  ...rest
}: CardProps<E>) {
  const Component = (as ?? 'article') as React.ElementType

  return (
    <Component
      className={cn(
        'bg-bone-100 border border-rule-soft rounded-md p-32',
        'transition-colors duration-fast ease-out',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  )
}
