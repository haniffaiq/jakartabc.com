import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUserMock, redirectMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: getCurrentUserMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

import PortalRoot from './page'

describe('PortalRoot', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset()
    redirectMock.mockClear()
  })

  it('redirects authenticated users to the dashboard', async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, email: 'client@jakartabc.com' })

    await expect(PortalRoot()).rejects.toThrow('redirect:/dashboard')
    expect(getCurrentUserMock).toHaveBeenCalledOnce()
    expect(redirectMock).toHaveBeenCalledWith('/dashboard')
  })

  it('redirects anonymous visitors to login', async () => {
    getCurrentUserMock.mockResolvedValue(null)

    await expect(PortalRoot()).rejects.toThrow('redirect:/login')
    expect(getCurrentUserMock).toHaveBeenCalledOnce()
    expect(redirectMock).toHaveBeenCalledWith('/login')
  })
})
