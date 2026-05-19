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
  'inline-flex items-center justify-center gap-8 rounded-md font-body text-body-md font-semibold ' +
  'transition-all duration-fast ease-out shadow-sm ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-navy-600 ' +
  'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-navy-700 text-bone-50 px-24 py-12 hover:bg-navy-800 active:bg-navy-900 hover:shadow-md ' +
    'disabled:bg-bone-200 disabled:text-ink-500 disabled:shadow-none',
  secondary:
    'border border-navy-700 text-navy-700 bg-transparent px-24 py-12 hover:bg-navy-100 shadow-none',
  ghost: 'text-navy-700 px-8 py-4 shadow-none underline-offset-4 hover:underline hover:text-navy-600',
  link: 'text-navy-600 underline underline-offset-4 hover:text-navy-700 p-0 shadow-none',
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block font-mono animate-spin-slow"
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
