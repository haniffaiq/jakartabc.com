import { describe, expect, it, vi } from 'vitest'

const payloadClient = { id: 'payload-client' }
const getPayload = vi.fn(async () => payloadClient)

vi.mock('payload', () => ({ getPayload }))
vi.mock('@payload-config', () => ({ default: { config: true } }))

describe('getPayloadClient', () => {
  it('returns the same instance across calls', async () => {
    const { getPayloadClient } = await import('./payload')

    const a = await getPayloadClient()
    const b = await getPayloadClient()

    expect(a).toBe(b)
    expect(getPayload).toHaveBeenCalledTimes(1)
  })
})
