'use client'

import * as React from 'react'

import { cn } from '../lib/cn'
import { Button } from './Button'
import { Input } from './Input'

export type ContactFormLabels = {
  name: string
  email: string
  company: string
  message: string
  submit: string
  sending: string
}

export type ContactFormState = 'idle' | 'loading' | 'success' | 'error'

export type ContactFormProps = {
  labels: ContactFormLabels
  state: ContactFormState
  errorMessage?: string
  successMessage?: string
  onSubmit: (data: FormData) => void
  className?: string
}

export function ContactForm({
  labels,
  state,
  errorMessage,
  successMessage,
  onSubmit,
  className,
}: ContactFormProps) {
  if (state === 'success') {
    return (
      <p
        role="status"
        aria-live="polite"
        className={cn('font-body text-body-lg text-ink-900', className)}
      >
        {successMessage}
      </p>
    )
  }

  return (
    <form
      className={cn('flex flex-col gap-8', className)}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(new FormData(event.currentTarget))
      }}
    >
      <input name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" />
      <Input name="name" label={labels.name} required autoComplete="name" />
      <Input name="email" type="email" label={labels.email} required autoComplete="email" />
      <Input name="company" label={labels.company} autoComplete="organization" />
      <div className="flex flex-col gap-4">
        <label htmlFor="contact-message" className="font-body text-eyebrow uppercase text-ink-500">
          {labels.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          className={cn(
            'border-b border-b-ink-500 bg-transparent px-0 py-8 font-body text-body-md text-ink-900',
            'focus:border-b-2 focus:border-b-ochre-600 focus:outline-none active:border-b-ochre-700',
            'placeholder:text-ink-500 disabled:bg-bone-100 disabled:text-ink-500',
          )}
        />
      </div>
      {state === 'error' && errorMessage ? (
        <p role="alert" className="font-body text-body-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" variant="primary" loading={state === 'loading'}>
        {state === 'loading' ? labels.sending : labels.submit}
      </Button>
    </form>
  )
}
