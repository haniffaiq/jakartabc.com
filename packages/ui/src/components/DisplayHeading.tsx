import * as React from 'react'

import { cn } from '../lib/cn'

type Level = 'h1' | 'h2' | 'h3' | 'h4'
type Size = 'xl' | 'lg' | 'md'

const sizeClass: Record<Size, string> = {
  xl: 'text-display-xl leading-[1.05]',
  lg: 'text-display-lg leading-[1.1]',
  md: 'text-display-md leading-[1.15]',
}

export type DisplayHeadingProps = {
  as?: Level
  size?: Size
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<Level>, 'as' | 'className' | 'children'>

export function DisplayHeading({
  as: Tag = 'h1',
  size = 'xl',
  className,
  children,
  ...rest
}: DisplayHeadingProps) {
  return (
    <Tag
      className={cn('text-balance font-display font-normal text-ink-900', sizeClass[size], className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}
