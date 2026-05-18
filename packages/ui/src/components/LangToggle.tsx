'use client'

import { cn } from '../lib/cn'

export type LocaleCode = 'en' | 'id'

export type LangToggleProps = {
  current: LocaleCode
  onChange: (next: LocaleCode) => void
  className?: string
}

export function LangToggle({ current, onChange, className }: LangToggleProps) {
  const next = current === 'en' ? 'id' : 'en'

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`Switch to ${next === 'id' ? 'Indonesian' : 'English'}`}
      className={cn('text-eyebrow uppercase tracking-[0.08em]', className)}
    >
      <span className={current === 'en' ? 'text-ink-900' : 'text-ink-500'}>EN</span>
      <span className="mx-1 text-ink-500" aria-hidden="true">
        {' · '}
      </span>
      <span className={current === 'id' ? 'text-ink-900' : 'text-ink-500'}>ID</span>
    </button>
  )
}
