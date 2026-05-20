import config from '@payload-config'
import { getPayload } from 'payload'

let cached: Awaited<ReturnType<typeof getPayload>> | null = null

export async function getPayloadClient() {
  if (cached) return cached

  // During `next build` the DB is intentionally unreachable (build runs in an
  // image-build container, not the compose network). Payload's postgres
  // adapter calls `process.exit(1)` on connect failure, which would kill the
  // build worker uncatchably. Throw a normal error instead so callers'
  // try/catch can fall back to empty data + on-demand rendering.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('payload client unavailable during build')
  }

  cached = await getPayload({ config })
  return cached
}
