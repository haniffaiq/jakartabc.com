import * as React from 'react'
import { redirect } from 'next/navigation'
import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

import { LogoutButton } from '@/components/LogoutButton'
import { getCurrentUser } from '@/lib/auth'

type PortalUser = {
  email?: string | null
  name?: string | null
  role?: string | null
}

export default async function Dashboard() {
  const user = (await getCurrentUser()) as PortalUser | null
  if (user?.role !== 'client') redirect('/login')

  const displayName = user.name ?? user.email ?? 'client'

  return (
    <main className="mx-auto max-w-container px-6 py-16 md:px-10">
      <div className="flex items-start justify-between gap-24">
        <div>
          <Eyebrow>CLIENT PORTAL · DASHBOARD</Eyebrow>
          <DisplayHeading size="lg" className="mt-6">
            Welcome, {displayName}.
          </DisplayHeading>
        </div>
        <LogoutButton />
      </div>

      <section className="mt-24 max-w-prose">
        <Eyebrow>Coming soon</Eyebrow>
        <p className="mt-4 text-body-md text-ink-700">
          Document upload and PT PMA setup tracking land in the next portal release. For now, your
          partner will continue to share status updates by email.
        </p>
      </section>
    </main>
  )
}
