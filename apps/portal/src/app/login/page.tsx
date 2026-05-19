import { Suspense } from 'react'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

import { LoginFormWired } from '@/components/LoginFormWired'

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-editorial flex-col justify-center px-6 py-16 md:px-10">
      <Eyebrow>CLIENT PORTAL</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">
        Sign in to continue.
      </DisplayHeading>
      <p className="mt-6 max-w-prose text-body-md text-ink-700">
        Authorized client access only. If you don&apos;t have an account, contact your Jakarta BC partner.
      </p>
      <div className="mt-12 max-w-prose">
        <Suspense>
          <LoginFormWired />
        </Suspense>
      </div>
    </main>
  )
}
