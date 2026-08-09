import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {
    DATABASE_URL: 'postgres://shared-user:shared-pass@db:5432/jakartabc',
    PAYLOAD_SECRET: 'shared-payload-secret-that-is-long-enough',
    NEXT_PUBLIC_PORTAL_URL: 'https://app.jakartabc.com',
  },
  buildConfig: vi.fn((config: unknown) => config),
  lexicalEditor: vi.fn(() => ({ editor: 'lexical' })),
  postgresAdapter: vi.fn((options: unknown) => ({ adapter: 'postgres', options })),
}))

vi.mock('@/env', () => ({ env: mocks.env }))
vi.mock('payload', () => ({ buildConfig: mocks.buildConfig }))
vi.mock('@payloadcms/richtext-lexical', () => ({ lexicalEditor: mocks.lexicalEditor }))
vi.mock('@payloadcms/db-postgres', () => ({ postgresAdapter: mocks.postgresAdapter }))

import config from './payload.config'

describe('portal Payload runtime configuration', () => {
  it('uses the validated shared environment contract', () => {
    const runtimeConfig = config as unknown as { secret: string; serverURL: string }

    expect(runtimeConfig.secret).toBe(mocks.env.PAYLOAD_SECRET)
    expect(runtimeConfig.serverURL).toBe(mocks.env.NEXT_PUBLIC_PORTAL_URL)
    expect(mocks.postgresAdapter).toHaveBeenCalledWith({
      pool: { connectionString: mocks.env.DATABASE_URL },
    })
  })
})
