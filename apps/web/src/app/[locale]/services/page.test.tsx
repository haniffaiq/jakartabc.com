import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()
const cacheMock = vi.fn((fn: () => unknown) => fn)

vi.mock('next/cache', () => ({
  unstable_cache: cacheMock,
}))

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => ({ find: findMock })),
}))

describe('services overview Payload adapter', () => {
  beforeEach(() => {
    findMock.mockReset()
    cacheMock.mockClear()
  })

  it('fetches ordered services from Payload with locale-aware cache keys', async () => {
    findMock.mockResolvedValueOnce({
      docs: [
        {
          slug: 'pt-pma-setup',
          name: 'PT PMA Setup',
          leadParagraph: 'Foreign-owned company establishment.',
          timelineLabel: '4-6 weeks',
        },
      ],
    })
    const { getServices } = await import('./page')

    await expect(getServices('id')).resolves.toEqual([
      {
        slug: 'pt-pma-setup',
        name: 'PT PMA Setup',
        leadParagraph: 'Foreign-owned company establishment.',
        timelineLabel: '4-6 weeks',
      },
    ])

    expect(findMock).toHaveBeenCalledWith({
      collection: 'services',
      sort: 'order',
      locale: 'id',
      limit: 50,
    })
    expect(cacheMock).toHaveBeenCalledWith(expect.any(Function), ['services-list-id'], {
      tags: ['services:list'],
    })
  })

  it('maps complete Payload service docs into EditorialList items', async () => {
    const { toEditorialListItems } = await import('./page')

    expect(
      toEditorialListItems([
        {
          slug: 'pt-pma-setup',
          name: 'PT PMA Setup',
          leadParagraph: 'Foreign-owned company establishment.',
          timelineLabel: '4-6 weeks',
        },
        { slug: 'draft', name: 'Draft service', leadParagraph: null, timelineLabel: 'TBD' },
      ]),
    ).toEqual([
      {
        slug: 'pt-pma-setup',
        title: 'PT PMA Setup',
        desc: 'Foreign-owned company establishment.',
        timeline: '4-6 weeks',
      },
    ])
  })
})
