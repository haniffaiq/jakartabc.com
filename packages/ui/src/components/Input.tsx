import * as React from 'react'

import { cn } from '../lib/cn'

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  name: string
  helper?: string
  error?: string
  id?: string
}

let _uid = 0

function useFallbackId(provided?: string) {
  const ref = React.useRef<string | null>(null)

  if (provided) {
    return provided
  }

  if (ref.current === null) {
    _uid += 1
    ref.current = `input-${_uid}`
  }

  return ref.current
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, name, helper, error, id, className, ...rest },
  ref,
) {
  const inputId = useFallbackId(id ?? `input-${name}`)
  const helperId = helper ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={inputId} className="font-body text-eyebrow uppercase text-ink-500">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'bg-transparent px-0 py-8 font-body text-body-md text-ink-900',
          'border-b border-b-ink-500',
          'focus:border-b-2 focus:border-b-ochre-600 focus:outline-none',
          'placeholder:text-ink-500 disabled:bg-bone-100 disabled:text-ink-500',
          error && 'border-b-2 border-b-danger focus:border-b-danger',
          className,
        )}
        {...rest}
      />
      {helper && !error ? (
        <p id={helperId} className="text-body-sm text-ink-500">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
})
