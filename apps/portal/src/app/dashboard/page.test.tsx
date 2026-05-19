import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCurrentUserMock = vi.fn()
const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`)
})

vi.mock('@/lib/auth', () => ({
  getCurrentUser: getCurrentUserMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/components/LogoutButton', () => ({
  LogoutButton: () => <button type="button">Sign out</button>,
}))

describe('Dashboard page', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset()
    redirectMock.mockClear()
  })

  it('redirects anonymous visitors to login', async () => {
    getCurrentUserMock.mockResolvedValue(null)
    const { default: Dashboard } = await import('./page')

    await expect(Dashboard()).rejects.toThrow('redirect:/login')
    expect(redirectMock).toHaveBeenCalledWith('/login')
  })

  it('renders a personal welcome and next-release placeholder for signed-in users', async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, email: 'client@example.com', name: 'Ayu Client' })
    const { default: Dashboard } = await import('./page')

    const html = renderToStaticMarkup(await Dashboard())

    expect(html).toContain('CLIENT PORTAL · DASHBOARD')
    expect(html).toContain('Welcome, Ayu Client.')
    expect(html).toContain('Coming soon')
    expect(html).toContain('Document upload and PT PMA setup tracking land in the next portal release.')
    expect(html).toContain('Sign out')
  })
})
