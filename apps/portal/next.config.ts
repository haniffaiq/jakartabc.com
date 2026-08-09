import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
].join(' ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; img-src 'self' data: blob:; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'`,
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typedRoutes: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default withPayload(nextConfig)
