import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Skip /admin, /api, _next, static files, and anything with a dot (assets).
  matcher: ['/((?!admin|api|_next|_vercel|.*\\..*).*)'],
}
