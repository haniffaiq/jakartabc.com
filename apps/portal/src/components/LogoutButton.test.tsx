import * as React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  logoutAction: vi.fn(async () => undefined),
  push: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  logoutAction: mocks.logoutAction,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

import { LogoutButton } from './LogoutButton'

describe('LogoutButton', () => {
  beforeEach(() => {
    mocks.logoutAction.mockClear()
    mocks.push.mockClear()
  })

  it('signs the portal user out and returns them to login', async () => {
    render(<LogoutButton />)

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(mocks.logoutAction).toHaveBeenCalledTimes(1))
    expect(mocks.push).toHaveBeenCalledWith('/login')
  })
})
