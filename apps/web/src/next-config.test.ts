import { describe, expect, it } from 'vitest'

import nextConfig from '../next.config'

/**
 * Payload pulls in `drizzle-kit`, which pulls in `esbuild` and its native
 * binary. Turbopack cannot parse that binary, so any route whose graph
 * reaches payload.config 500s unless these stay external to the bundle.
 */
describe('next.config', () => {
  it('keeps the unbundlable Payload dependencies external', () => {
    // withPayload additionally externalizes `payload` and the `@payloadcms/*`
    // entry points, but only under NODE_ENV=development. These are the ones
    // that must stay external in every mode.
    expect(nextConfig.serverExternalPackages).toEqual(
      expect.arrayContaining(['drizzle-kit', 'drizzle-kit/api', 'sharp', 'libsql', 'pino']),
    )
  })

  it('excludes drizzle-kit from the standalone output trace', () => {
    expect(nextConfig.outputFileTracingExcludes?.['**/*']).toEqual(
      expect.arrayContaining(['drizzle-kit', 'drizzle-kit/api']),
    )
  })

  it('still serves the security headers for every path', async () => {
    const headers = await nextConfig.headers!()
    const keys = headers.flatMap((entry) => entry.headers.map((header) => header.key))

    expect(keys).toEqual(
      expect.arrayContaining([
        'X-Frame-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'Content-Security-Policy',
      ]),
    )
  })

  it('does not advertise the server stack', async () => {
    expect(nextConfig.poweredByHeader).toBe(false)

    const headers = await nextConfig.headers!()
    const keys = headers.flatMap((entry) => entry.headers.map((header) => header.key))

    expect(keys).not.toContain('X-Powered-By')
  })
})
