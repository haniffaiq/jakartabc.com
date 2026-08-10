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
  const submissionIdRef = React.useRef<string | null>(null)
  const isSubmittingRef = React.useRef(false)
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
          if (isSubmittingRef.current) return

          isSubmittingRef.current = true
          submissionIdRef.current ??= crypto.randomUUID()
          const serviceSlug = formData.get('service')
          formData.set('locale', locale)
          formData.set('turnstileToken', turnstileTokenRef.current)
          formData.set('submissionId', submissionIdRef.current)
          if (typeof serviceSlug === 'string') {
            formData.set('serviceSlug', serviceSlug)
          }

          startTransition(async () => {
            try {
              const nextResult = await submitBooking(formData)
              setResult(nextResult)
              if (nextResult.ok) {
                submissionIdRef.current = crypto.randomUUID()
                return
              }

              setTurnstileToken('')
              setTurnstileKey((key) => key + 1)
            } catch {
              setResult({ ok: false, code: 'unknown' })
              setTurnstileToken('')
              setTurnstileKey((key) => key + 1)
            } finally {
              isSubmittingRef.current = false
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
