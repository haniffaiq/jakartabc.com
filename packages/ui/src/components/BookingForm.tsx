'use client'

import * as React from 'react'

import { cn } from '../lib/cn'
import { Button } from './Button'
import { Input } from './Input'

export type BookingFormLabels = {
  name: string
  email: string
  company: string
  phone: string
  service: string
  preferredWindows: string
  message: string
  submit: string
  sending: string
}

export type BookingFormState = 'idle' | 'loading' | 'success' | 'error'

export type BookingFormProps = {
  labels: BookingFormLabels
  services: { slug: string; name: string }[]
  state: BookingFormState
  errorMessage?: string
  successMessage?: string
  defaultService?: string
  onSubmit: (data: FormData) => void
  className?: string
}

const WINDOWS = [
  { value: 'mon-am', label: 'Mon AM' },
  { value: 'mon-pm', label: 'Mon PM' },
  { value: 'tue-am', label: 'Tue AM' },
  { value: 'tue-pm', label: 'Tue PM' },
  { value: 'wed-am', label: 'Wed AM' },
  { value: 'wed-pm', label: 'Wed PM' },
  { value: 'thu-am', label: 'Thu AM' },
  { value: 'thu-pm', label: 'Thu PM' },
  { value: 'fri-am', label: 'Fri AM' },
  { value: 'fri-pm', label: 'Fri PM' },
] as const

export function BookingForm({
  labels,
  services,
  state,
  errorMessage,
  successMessage,
  defaultService,
  onSubmit,
  className,
}: BookingFormProps) {
  if (state === 'success') {
    return (
      <p role="status" aria-live="polite" className={cn('font-body text-body-lg text-ink-900', className)}>
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
      <Input name="phone" type="tel" label={labels.phone} autoComplete="tel" />

      <div className="flex flex-col gap-4">
        <label htmlFor="booking-service" className="font-body text-eyebrow uppercase text-ink-500">
          {labels.service}
        </label>
        <select
          id="booking-service"
          name="service"
          defaultValue={defaultService ?? ''}
          required
          className={cn(
            'border-b border-b-ink-500 bg-transparent px-0 py-8 font-body text-body-md text-ink-900',
            'focus:border-b-2 focus:border-b-ochre-600 focus:outline-none',
            'disabled:bg-bone-100 disabled:text-ink-500',
          )}
        >
          <option value="" disabled>
            —
          </option>
          {services.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-body text-eyebrow uppercase text-ink-500">{labels.preferredWindows}</legend>
        <div className="grid grid-cols-2 gap-x-16 gap-y-8 md:grid-cols-5">
          {WINDOWS.map((window) => (
            <label key={window.value} className="flex items-center gap-8 font-body text-body-sm text-ink-900">
              <input
                type="checkbox"
                name="preferredWindows"
                value={window.value}
                className="size-16 accent-ochre-600"
              />
              {window.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4">
        <label htmlFor="booking-message" className="font-body text-eyebrow uppercase text-ink-500">
          {labels.message}
        </label>
        <textarea
          id="booking-message"
          name="message"
          rows={5}
          required
          className={cn(
            'border-b border-b-ink-500 bg-transparent px-0 py-8 font-body text-body-md text-ink-900',
            'focus:border-b-2 focus:border-b-ochre-600 focus:outline-none',
            'placeholder:text-ink-500 disabled:bg-bone-100 disabled:text-ink-500',
          )}
        />
      </div>

      {state === 'error' && errorMessage ? (
        <p role="alert" className="font-body text-body-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div data-cf-turnstile="booking" slot="turnstile" />

      <Button type="submit" variant="primary" loading={state === 'loading'}>
        {state === 'loading' ? labels.sending : labels.submit}
      </Button>
    </form>
  )
}
