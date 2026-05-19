import React from 'react'
import Link from 'next/link'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-editorial px-6 py-32 md:px-10 md:py-48">
      <Eyebrow>404</Eyebrow>
      <DisplayHeading size="lg" className="mt-6">
        This page isn&apos;t here.
      </DisplayHeading>
      <p className="mt-6 max-w-prose text-body-lg text-ink-700">
        It may have been moved, or the link is incorrect.
      </p>
      <p className="mt-12">
        <Link href="/dashboard" className="text-ochre-700 underline underline-offset-4">
          Back to dashboard
        </Link>
      </p>
    </main>
  )
}
