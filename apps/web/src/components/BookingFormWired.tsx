'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { BookingForm, type BookingFormLabels, type BookingFormState } from '@jakartabc/ui'
import * as React from 'react'

import { submitBooking, type SubmitBookingResult } from '@/app/[locale]/actions/booking'

type ServiceOption = { slug: string; name: string }

type BookingFormWiredProps = {
  labels: BookingFormLabels
  services: ServiceOption[]
  locale: 'en' | 'id'
  defaultService?: string
  successMessage: string
  className?: string
}

function getFormState(result: SubmitBookingResult | null, isPending: boolean): BookingFormState {
  if (isPending) return 'loading'
  if (result === null) return 'idle'
  return result.ok ? 'success' : 'error'
}

export function BookingFormWired({
  labels,
  services,
  locale,
  defaultService,
  successMessage,
  className,
}: BookingFormWiredProps) {
  const [result, setResult] = React.useState<SubmitBookingResult | null>(null)
  const turnstileTokenRef = React.useRef('')
  const [turnstileKey, setTurnstileKey] = React.useState(0)
  const [isPending, startTransition] = React.useTransition()
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'

  const setTurnstileToken = React.useCallback((token: string) => {
    turnstileTokenRef.current = token
  }, [])

  const state = getFormState(result, isPending)
  const errorMessage =
    result && !result.ok
      ? locale === 'en'
        ? 'Couldn’t send. Please email us: hello@jakartabc.com'
        : 'Tidak terkirim. Email kami: hello@jakartabc.com'
      : undefined

  return (
    <div className={className}>
      <BookingForm
        labels={labels}
        services={services}
        defaultService={defaultService}
        state={state}
        errorMessage={errorMessage}
        successMessage={successMessage}
        onSubmit={(formData) => {
          const serviceSlug = formData.get('service')
          formData.set('locale', locale)
          formData.set('turnstileToken', turnstileTokenRef.current)
          if (typeof serviceSlug === 'string') {
            formData.set('serviceSlug', serviceSlug)
          }

          startTransition(async () => {
            const nextResult = await submitBooking(formData)
            setResult(nextResult)
            if (!nextResult.ok) {
              setTurnstileToken('')
              setTurnstileKey((key) => key + 1)
            }
          })
        }}
      />
      {state === 'success' ? null : (
        <div className="mt-24">
          <Turnstile
            key={turnstileKey}
            siteKey={siteKey}
            options={{ theme: 'light' }}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken('')}
            onError={() => setTurnstileToken('')}
          />
        </div>
      )}
    </div>
  )
}
