'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { ContactForm, type ContactFormLabels, type ContactFormState } from '@jakartabc/ui'
import * as React from 'react'

import { submitContact, type SubmitResult } from '@/app/[locale]/actions/contact'

type ContactFormWiredProps = {
  labels: ContactFormLabels
  locale: 'en' | 'id'
  successMessage: string
  className?: string
}

function getFormState(result: SubmitResult | null, isPending: boolean): ContactFormState {
  if (isPending) return 'loading'
  if (result === null) return 'idle'
  return result.ok ? 'success' : 'error'
}

export function ContactFormWired({
  labels,
  locale,
  successMessage,
  className,
}: ContactFormWiredProps) {
  const [result, setResult] = React.useState<SubmitResult | null>(null)
  const [turnstileKey, setTurnstileKey] = React.useState(0)
  const [isPending, startTransition] = React.useTransition()
  const submissionIdRef = React.useRef<string | null>(null)
  const isSubmittingRef = React.useRef(false)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'
  const turnstileTokenRef = React.useRef(siteKey.startsWith('1x000') ? 'e2e-turnstile-token' : '')

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
      <ContactForm
        labels={labels}
        state={state}
        errorMessage={errorMessage}
        successMessage={successMessage}
        onSubmit={(formData) => {
          if (isSubmittingRef.current) return

          isSubmittingRef.current = true
          submissionIdRef.current ??= crypto.randomUUID()
          formData.set('locale', locale)
          formData.set('turnstileToken', turnstileTokenRef.current)
          formData.set('submissionId', submissionIdRef.current)

          startTransition(async () => {
            try {
              const nextResult = await submitContact(formData)
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
