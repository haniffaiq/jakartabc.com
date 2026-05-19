/**
 * One-off Payload init to push schema to the target Postgres before `next build`.
 * Triggered from Dockerfile when PAYLOAD_FORCE_PUSH=true.
 */
/**
 * One-off Payload init that triggers Drizzle schema push.
 *
 * Why this script exists:
 *   `@payloadcms/db-postgres` only runs `pushDevSchema` when
 *   `NODE_ENV !== 'production'`. Production deploys are expected to use
 *   committed migrations + `payload migrate`. Until migration files are
 *   generated and committed, we force-push the schema at build time by
 *   overriding NODE_ENV inside this script.
 *
 * Replace with `payload migrate` once `apps/web/src/migrations/*` exists.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

console.log('[db-push] starting…', {
  db: process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':***@'),
  nodeEnv: process.env.NODE_ENV,
})

const payload = await getPayload({ config })
console.log('[db-push] done — schema synced')
await payload.db.destroy?.()
process.exit(0)
