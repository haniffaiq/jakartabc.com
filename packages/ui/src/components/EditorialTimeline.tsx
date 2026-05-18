import * as React from 'react'

import { cn } from '../lib/cn'

export type TimelineStep = {
  week: string
  label: string
  who: 'we' | 'joint' | 'you'
  docs?: string[]
}

export type EditorialTimelineProps = {
  steps: TimelineStep[]
  labels: { we: string; joint: string; you: string }
  className?: string
} & Omit<React.ComponentPropsWithoutRef<'ol'>, 'children'>

export function EditorialTimeline({ steps, labels, className, ...rest }: EditorialTimelineProps) {
  return (
    <ol className={cn('relative ml-6 border-l border-ink-900/15', className)} {...rest}>
      {steps.map((step, index) => (
        <li key={`${step.week}-${index}`} className="relative pb-12 pl-8 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute -left-[7px] top-2 h-3 w-3 rounded-full bg-ink-900"
          />
          <p className="font-mono text-mono-sm uppercase tracking-[0.08em] text-ink-500 tabular-nums">
            {step.week}
          </p>
          <p className="mt-2 text-body-lg text-ink-900">{step.label}</p>
          <p className="mt-2 text-body-sm text-ink-700">
            <span className="font-medium">{labels[step.who]}</span>
            {step.docs && step.docs.length > 0 ? (
              <span>. Docs: {step.docs.join(', ')}.</span>
            ) : (
              <span>.</span>
            )}
          </p>
        </li>
      ))}
    </ol>
  )
}
