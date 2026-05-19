import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'jbc_portal_session'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  if (path.startsWith('/dashboard')) {
    const token = req.cookies.get(COOKIE_NAME)?.value

    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('next', path)

      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
