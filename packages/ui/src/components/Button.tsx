import * as React from 'react'
import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link'

type CommonProps = {
  variant?: ButtonVariant
  loading?: boolean
  className?: string
  children: React.ReactNode
}

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined
  }

type ButtonAsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string
  }

export type ButtonProps = ButtonAsButton | ButtonAsLink

const base =
  'inline-flex items-center justify-center gap-8 rounded-sm font-body text-body-md ' +
  'transition-colors duration-fast ease-out ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-ochre-600 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ochre-600 text-bone-50 px-24 py-12 hover:bg-ochre-700 ' +
    'disabled:bg-bone-200 disabled:text-ink-500',
  secondary: 'border border-ink-900 text-ink-900 bg-transparent px-24 py-12 ' + 'hover:bg-bone-100',
  ghost: 'text-ink-900 px-8 py-4 underline-offset-4 hover:underline hover:text-ochre-700',
  link: 'text-ochre-700 underline underline-offset-4 hover:text-ochre-600 p-0',
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block font-mono animate-spin"
      style={{ animationDuration: '1.2s' }}
    >
      ·
    </span>
  )
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', loading = false, className, children, ...rest } = props
  const classes = cn(base, variants[variant], className)

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as ButtonAsLink
    return (
      <a {...anchorRest} href={href} className={classes} aria-busy={loading || undefined}>
        {loading ? <Spinner /> : null}
        {children}
      </a>
    )
  }

  const buttonRest = rest as ButtonAsButton
  return (
    <button
      {...buttonRest}
      type={buttonRest.type ?? 'button'}
      className={classes}
      disabled={loading || buttonRest.disabled}
      aria-busy={loading || undefined}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}
