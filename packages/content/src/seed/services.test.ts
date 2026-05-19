import { describe, expect, it, vi } from 'vitest'

import { SERVICE_SEEDS, seedServices } from './services'

type PayloadCall = {
  collection: string
  locale?: string
  data?: Record<string, unknown>
  where?: Record<string, unknown>
}

describe('seedServices', () => {
  it('defines the four core service records in display order', () => {
    expect(SERVICE_SEEDS.map((service) => service.slug)).toEqual([
      'pt-pma-setup',
      'sector-licensing',
      'tax-accounting',
      'investor-kitas',
    ])
    expect(SERVICE_SEEDS.map((service) => service.order)).toEqual([1, 2, 3, 4])
  })

  it('creates missing services in EN then updates localized ID fields', async () => {
    const create = vi.fn(async ({ data }: PayloadCall) => ({ id: `created-${data?.slug}` }))
    const update = vi.fn(async () => ({}))
    const payload = {
      find: vi.fn(async () => ({ docs: [] })),
      create,
      update,
    }

    await seedServices(payload as never)

    expect(payload.find).toHaveBeenCalledTimes(4)
    expect(create).toHaveBeenCalledTimes(4)
    expect(update).toHaveBeenCalledTimes(4)
    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'services',
        locale: 'en',
        data: expect.objectContaining({
          slug: 'pt-pma-setup',
          name: 'PT PMA Setup',
          pricing: { govFee: 2_500_000, ourFee: 18_000_000, currency: 'IDR' },
          overview: expect.objectContaining({ root: expect.any(Object) }),
        }),
      }),
    )
    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'services',
        id: 'created-pt-pma-setup',
        locale: 'id',
        data: expect.objectContaining({ name: 'Pendirian PT PMA' }),
      }),
    )
  })

  it('updates existing services by slug without creating duplicates', async () => {
    const payload = {
      find: vi.fn(async () => ({ docs: [{ id: 42 }] })),
      create: vi.fn(),
      update: vi.fn(async () => ({})),
    }

    await seedServices(payload as never)

    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).toHaveBeenCalledTimes(8)
    expect(payload.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'services',
        id: 42,
        locale: 'en',
        data: expect.objectContaining({ name: 'PT PMA Setup' }),
      }),
    )
    expect(payload.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'services',
        id: 42,
        locale: 'id',
        data: expect.not.objectContaining({ pricing: expect.anything() }),
      }),
    )
  })
})
