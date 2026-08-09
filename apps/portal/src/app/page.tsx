import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth'

export default async function PortalRoot() {
  const user = await getCurrentUser()

  if (user?.role === 'client') redirect('/dashboard')

  redirect('/login')
}
