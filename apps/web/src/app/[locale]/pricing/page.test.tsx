import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()
const cacheMock = vi.fn((fn: () => unknown) => fn)

vi.mock('next/cache', () => ({
  unstable_cache: cacheMock,
}))

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => ({ find: findMock })),
}))

describe('pricing Payload adapter', () => {
  beforeEach(() => {
    findMock.mockReset()
    cacheMock.mockClear()
  })

  it('fetches services for pricing from Payload with locale-aware cache tags', async () => {
    findMock.mockResolvedValueOnce({
      docs: [
        { name: 'PT PMA Setup', pricing: { govFee: 2500000, ourFee: 18000000, currency: 'IDR' } },
      ],
    })
    const { getServicesForPricing } = await import('./page')

    await expect(getServicesForPricing('id')).resolves.toEqual([
      { name: 'PT PMA Setup', pricing: { govFee: 2500000, ourFee: 18000000, currency: 'IDR' } },
    ])

    expect(findMock).toHaveBeenCalledWith({
      collection: 'services',
      sort: 'order',
      locale: 'id',
      limit: 100,
    })
    expect(cacheMock).toHaveBeenCalledWith(expect.any(Function), ['pricing-id'], {
      tags: ['pricing', 'services:list'],
    })
  })

  it('builds PricingTable rows only from services with prices', async () => {
    const { toPricingRows } = await import('./page')

    expect(
      toPricingRows([
        { name: 'PT PMA Setup', pricing: { govFee: 2500000, ourFee: 18000000, currency: 'IDR' } },
        { name: 'Draft service', pricing: { govFee: 0, ourFee: 0, currency: 'IDR' } },
        { name: 'No pricing' },
        { name: 'Sector licensing', pricing: { govFee: 0, ourFee: 4000000, currency: 'IDR' } },
      ]),
    ).toEqual([
      { label: 'PT PMA Setup', govFee: 2500000, ourFee: 18000000 },
      { label: 'Sector licensing', govFee: 0, ourFee: 4000000 },
    ])
  })
})
