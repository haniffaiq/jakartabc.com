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

export function ContactFormWired({ labels, locale, successMessage, className }: ContactFormWiredProps) {
  const [result, setResult] = React.useState<SubmitResult | null>(null)
  const [turnstileKey, setTurnstileKey] = React.useState(0)
  const [isPending, startTransition] = React.useTransition()
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
          formData.set('locale', locale)
          formData.set('turnstileToken', turnstileTokenRef.current)

          startTransition(async () => {
            const nextResult = await submitContact(formData)
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
