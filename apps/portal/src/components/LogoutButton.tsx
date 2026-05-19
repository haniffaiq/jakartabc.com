'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@jakartabc/ui'

import { logoutAction } from '@/lib/auth'

export function LogoutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await logoutAction()
          router.push('/login')
        })
      }
    >
      Sign out
    </Button>
  )
}
