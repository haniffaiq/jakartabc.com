import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL = { ...process.env }
const importEnvCase = async (_name: string): Promise<typeof import('./env')> => {
  vi.resetModules()
  return import('./env')
}

function setValidEnv(overrides: Record<string, string | undefined> = {}) {
  process.env.DATABASE_URL = 'postgres://user:pass@db:5432/jakartabc'
  process.env.PAYLOAD_SECRET = 'x'.repeat(32)
  process.env.PORTAL_COOKIE_DOMAIN = 'app.jakartabc.com'
  process.env.NEXT_PUBLIC_PORTAL_URL = 'https://app.jakartabc.com'

  Object.assign(process.env, overrides)
}

afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe('portal environment schema', () => {
  it('parses the shared database and Payload contract from explicit input', async () => {
    setValidEnv()
    const mod = await importEnvCase('shared-contract')

    const parsed = mod.parseServerEnv(process.env)

    expect(parsed).toMatchObject({
      DATABASE_URL: 'postgres://user:pass@db:5432/jakartabc',
      PAYLOAD_SECRET: 'x'.repeat(32),
      PORTAL_COOKIE_DOMAIN: 'app.jakartabc.com',
      NEXT_PUBLIC_PORTAL_URL: 'https://app.jakartabc.com',
    })
    expect(parsed).not.toHaveProperty('PORTAL_PAYLOAD_SECRET')
  })

  it('does not accept the removed portal-only Payload secret', async () => {
    setValidEnv({ PAYLOAD_SECRET: undefined, PORTAL_PAYLOAD_SECRET: 'x'.repeat(32) })

    await expect(importEnvCase('legacy-secret')).rejects.toThrow(/PAYLOAD_SECRET/)
  })

  it('rejects a short shared Payload secret', async () => {
    setValidEnv({ PAYLOAD_SECRET: 'too-short' })

    await expect(importEnvCase('short-secret')).rejects.toThrow(/PAYLOAD_SECRET/)
  })
})
