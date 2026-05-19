'use client'

import React from 'react'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-editorial px-6 py-32 md:px-10 md:py-48">
      <Eyebrow>500</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">
        Something on our end isn&apos;t working.
      </DisplayHeading>
      <p className="mt-6 max-w-prose text-body-lg text-ink-700">
        Try again, or contact your partner if it persists.
      </p>
      <p className="mt-12">
        <button type="button" onClick={reset} className="text-ochre-700 underline underline-offset-4">
          Try again
        </button>
      </p>
    </main>
  )
}
