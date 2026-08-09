import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createLocalReqMock, logoutOperationMock } = vi.hoisted(() => ({
  createLocalReqMock: vi.fn(),
  logoutOperationMock: vi.fn(),
}))

const loginMock = vi.fn()
const authMock = vi.fn(
  async (_args?: { headers: Headers }): Promise<{ user: unknown | null }> => ({ user: null }),
)
const cookieStoreSet = vi.fn()
const cookieStoreGet = vi.fn()
const cookieStoreDelete = vi.fn()
const usersCollection = { config: { slug: 'users' } }
const payloadRequest = { user: null }
const payloadClient = {
  login: loginMock,
  auth: authMock,
  collections: { users: usersCollection },
}

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => payloadClient),
}))

vi.mock('payload', () => ({
  createLocalReq: createLocalReqMock,
  logoutOperation: logoutOperationMock,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: cookieStoreSet,
    get: cookieStoreGet,
    delete: cookieStoreDelete,
  })),
  headers: vi.fn(async () => new Headers()),
}))

import { getCurrentUser, loginAction, logoutAction } from './auth'

describe('auth Server Actions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    loginMock.mockReset()
    authMock.mockReset()
    authMock.mockResolvedValue({ user: null })
    cookieStoreSet.mockReset()
    cookieStoreGet.mockReset()
    cookieStoreDelete.mockReset()
    createLocalReqMock.mockReset()
    createLocalReqMock.mockResolvedValue(payloadRequest)
    logoutOperationMock.mockReset()
    logoutOperationMock.mockResolvedValue(true)
    process.env.PORTAL_COOKIE_DOMAIN = 'app.jakartabc.com'
  })

  it('sets a secure portal cookie when login succeeds', async () => {
    loginMock.mockResolvedValue({ user: { id: 1, email: 'u@x.co', role: 'client' }, token: 'tok' })
    const formData = new FormData()
    formData.set('email', 'U@X.CO')
    formData.set('password', 'pw')

    const result = await loginAction(null, formData)

    expect(result).toEqual({ ok: true })
    expect(loginMock).toHaveBeenCalledWith({
      collection: 'users',
      data: { email: 'u@x.co', password: 'pw' },
    })
    expect(cookieStoreSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'jbc_portal_session',
        value: 'tok',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        domain: 'app.jakartabc.com',
      }),
    )
  })

  it.each(['admin', 'editor'])('forbids %s login without writing a portal cookie', async (role) => {
    const user = {
      id: 1,
      email: `${role}@x.co`,
      role,
      collection: 'users',
      _sid: `${role}-sid`,
    }
    loginMock.mockResolvedValue({ user: { id: 1, email: `${role}@x.co`, role }, token: 'tok' })
    authMock.mockResolvedValue({ user })
    const formData = new FormData()
    formData.set('email', `${role}@x.co`)
    formData.set('password', 'pw')

    await expect(loginAction(null, formData)).resolves.toEqual({ ok: false, error: 'forbidden' })
    expect(cookieStoreSet).not.toHaveBeenCalled()
    expect(authMock).toHaveBeenCalledWith({
      headers: expect.objectContaining({}),
    })
    const authHeaders = authMock.mock.calls[0]?.[0]?.headers
    expect(authHeaders?.get('authorization')).toBe('JWT tok')
    expect(authHeaders?.get('DisableAutologin')).toBe('true')
    expect(createLocalReqMock).toHaveBeenCalledWith(
      { req: { headers: authHeaders }, user },
      payloadClient,
    )
    expect(logoutOperationMock).toHaveBeenCalledWith({
      collection: usersCollection,
      req: payloadRequest,
    })
  })

  it('fails closed when a forbidden login session cannot be revoked', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    loginMock.mockResolvedValue({
      user: { id: 1, email: 'admin@x.co', role: 'admin' },
      token: 'tok',
    })
    authMock.mockResolvedValue({
      user: { id: 1, role: 'admin', collection: 'users', _sid: 'admin-sid' },
    })
    logoutOperationMock.mockRejectedValue(new Error('database unavailable'))
    const formData = new FormData()
    formData.set('email', 'admin@x.co')
    formData.set('password', 'pw')

    await expect(loginAction(null, formData)).resolves.toEqual({ ok: false, error: 'server' })
    expect(logoutOperationMock).toHaveBeenCalledOnce()
    expect(cookieStoreSet).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('[portal-auth] login failed', 'Error')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('tok')
  })

  it('returns invalid when Payload rejects credentials', async () => {
    loginMock.mockRejectedValue(new Error('Invalid credentials'))
    const formData = new FormData()
    formData.set('email', 'u@x.co')
    formData.set('password', 'wrong')

    await expect(loginAction(null, formData)).resolves.toEqual({ ok: false, error: 'invalid' })
    expect(cookieStoreSet).not.toHaveBeenCalled()
  })

  it('returns invalid when Payload reports incorrect credentials', async () => {
    loginMock.mockRejectedValue(new Error('The email or password provided is incorrect.'))
    const formData = new FormData()
    formData.set('email', 'u@x.co')
    formData.set('password', 'wrong')

    await expect(loginAction(null, formData)).resolves.toEqual({ ok: false, error: 'invalid' })
    expect(cookieStoreSet).not.toHaveBeenCalled()
  })

  it('returns validation when required fields are missing', async () => {
    const formData = new FormData()
    formData.set('email', '')
    formData.set('password', 'pw')

    await expect(loginAction(null, formData)).resolves.toEqual({ ok: false, error: 'validation' })
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('expires the domain-scoped portal session cookie on logout', async () => {
    cookieStoreGet.mockReturnValue(undefined)

    await logoutAction()

    expect(cookieStoreSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'jbc_portal_session',
        value: '',
        maxAge: 0,
        path: '/',
        domain: 'app.jakartabc.com',
      }),
    )
    expect(logoutOperationMock).not.toHaveBeenCalled()
  })

  it('revokes the server session before clearing the logout cookie', async () => {
    const user = { id: 1, role: 'client', collection: 'users', _sid: 'client-sid' }
    cookieStoreGet.mockReturnValue({ name: 'jbc_portal_session', value: 'tok' })
    authMock.mockResolvedValue({ user })

    await logoutAction()

    expect(logoutOperationMock).toHaveBeenCalledWith({
      collection: usersCollection,
      req: payloadRequest,
    })
    expect(cookieStoreSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'jbc_portal_session', value: '', maxAge: 0 }),
    )
    expect(logoutOperationMock.mock.invocationCallOrder[0]).toBeLessThan(
      cookieStoreSet.mock.invocationCallOrder[0]!,
    )
  })

  it('clears the logout cookie even when server session revocation fails', async () => {
    cookieStoreGet.mockReturnValue({ name: 'jbc_portal_session', value: 'tok' })
    authMock.mockResolvedValue({
      user: { id: 1, role: 'client', collection: 'users', _sid: 'client-sid' },
    })
    logoutOperationMock.mockRejectedValue(new Error('database unavailable'))

    await expect(logoutAction()).rejects.toThrow('database unavailable')
    expect(logoutOperationMock).toHaveBeenCalledOnce()
    expect(cookieStoreSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'jbc_portal_session', value: '', maxAge: 0 }),
    )
  })

  it('returns null when no portal session cookie exists', async () => {
    cookieStoreGet.mockReturnValue(undefined)

    await expect(getCurrentUser()).resolves.toBeNull()
    expect(authMock).not.toHaveBeenCalled()
  })

  it('forwards the portal token to Payload auth when present', async () => {
    const user = { id: 1, email: 'u@x.co', role: 'client' }
    cookieStoreGet.mockReturnValue({ name: 'jbc_portal_session', value: 'tok' })
    authMock.mockResolvedValue({ user })

    await expect(getCurrentUser()).resolves.toEqual(user)

    const call = authMock.mock.calls[0]?.[0]
    expect(call).toBeDefined()
    expect(call?.headers.get('authorization')).toBe('JWT tok')
    expect(call?.headers.get('cookie')).toBe('jbc_portal_session=tok')
  })

  it.each(['admin', 'editor'])('returns null for an authenticated %s user', async (role) => {
    cookieStoreGet.mockReturnValue({ name: 'jbc_portal_session', value: 'tok' })
    authMock.mockResolvedValue({ user: { id: 1, email: `${role}@x.co`, role } })

    await expect(getCurrentUser()).resolves.toBeNull()
  })
})
