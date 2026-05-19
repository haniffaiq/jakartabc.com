import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { middleware } from './middleware'

function req(path: string, cookie?: string) {
  const headers = new Headers()
  if (cookie) headers.set('cookie', `jbc_portal_session=${cookie}`)

  return new NextRequest(new URL(`https://app.jakartabc.com${path}`), { headers })
}

describe('middleware', () => {
  it('redirects /dashboard to /login when no cookie is present', () => {
    const res = middleware(req('/dashboard'))

    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/login')
    expect(res?.headers.get('location')).toContain('next=%2Fdashboard')
  })

  it('preserves nested dashboard path in the next parameter', () => {
    const res = middleware(req('/dashboard/cases/acme'))

    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('next=%2Fdashboard%2Fcases%2Facme')
  })

  it('lets /dashboard through when cookie is present', () => {
    const res = middleware(req('/dashboard', 'tok'))

    expect(res === undefined || res.status === 200).toBe(true)
  })

  it('does not touch /login', () => {
    const res = middleware(req('/login'))

    expect(res === undefined || res.status === 200).toBe(true)
  })
})
