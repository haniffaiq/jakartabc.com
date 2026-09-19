import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://challenges.cloudflare.com",
      'frame-src https://challenges.cloudflare.com',
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // withPayload would otherwise append an X-Powered-By naming the stack.
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

// Payload drags in drizzle-kit -> esbuild, whose native binary Turbopack
// cannot parse. withPayload marks those packages external (and excludes
// drizzle-kit from the standalone trace); without it every route that
// reaches payload.config fails to compile.
export default withPayload(withNextIntl(nextConfig))
