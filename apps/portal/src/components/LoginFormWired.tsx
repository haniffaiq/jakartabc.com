'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input } from '@jakartabc/ui'

import { loginAction, type LoginResult } from '@/lib/auth'
import { safeNextPath } from '@/lib/safe-redirect'

export function LoginFormWired() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))

  const [state, formAction, isPending] = useActionState<LoginResult | null, FormData>(
    async (previousState, formData) => loginAction(previousState, formData),
    null,
  )

  React.useEffect(() => {
    if (state?.ok) {
      router.replace(next)
    }
  }, [state, router, next])

  const errorMessage = state && !state.ok ? getLoginErrorMessage(state.error) : null

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <Input name="email" type="email" label="Email" required autoComplete="email" />
      <Input
        name="password"
        type="password"
        label="Password"
        required
        autoComplete="current-password"
      />

      {errorMessage ? (
        <p role="alert" className="text-body-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" variant="primary" loading={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

function getLoginErrorMessage(error: Exclude<LoginResult, { ok: true }>['error']) {
  if (error === 'invalid') {
    return 'Email or password is incorrect.'
  }

  if (error === 'validation') {
    return 'Please enter a valid email and password.'
  }

  if (error === 'forbidden') {
    return 'This account is not authorized for the client portal.'
  }

  return 'Something went wrong. Try again.'
}
