import { afterEach, describe, expect, it } from 'vitest'

const ORIGINAL = { ...process.env }
const importEnvCase = (name: string): Promise<typeof import('./env')> => import(`./env?case=${name}`)

afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe('env schema', () => {
  it('rejects short PAYLOAD_SECRET', async () => {
    process.env.DATABASE_URL = 'postgres://u:***@localhost:5432/db'
    process.env.PAYLOAD_SECRET = 'too-short'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'

    await expect(importEnvCase('short')).rejects.toThrow(/PAYLOAD_SECRET/)
  })

  it('accepts a valid configuration', async () => {
    process.env.DATABASE_URL = 'postgres://u:***@localhost:5432/db'
    process.env.PAYLOAD_SECRET = 'x'.repeat(32)
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'

    const mod = await importEnvCase('ok')

    expect(mod.env.DEFAULT_LOCALE).toBe('en')
  })
})
