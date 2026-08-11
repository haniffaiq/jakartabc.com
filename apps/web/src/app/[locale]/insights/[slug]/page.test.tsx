import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { cacheMock, findMock, notFoundMock } = vi.hoisted(() => ({
  cacheMock: vi.fn((fn: () => unknown) => fn),
  findMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/cache', () => ({
  unstable_cache: cacheMock,
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}))

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => ({ find: findMock })),
}))

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'id'], defaultLocale: 'en' },
}))

vi.mock('@/components/LocalizedLink', () => ({
  LocalizedLink: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', null, children),
}))

vi.mock('@/lib/richTextRender', () => ({
  RichTextRender: () => React.createElement('div'),
}))

describe('InsightDetailPage', () => {
  beforeEach(() => {
    cacheMock.mockClear()
    findMock.mockReset()
    notFoundMock.mockClear()
    vi.unstubAllEnvs()
  })

  it('queries native published status by locale and slug with canonical cache tags', async () => {
    const { getInsightBySlug } = await import('./page')
    findMock.mockResolvedValueOnce({ docs: [] })

    await getInsightBySlug('bkpm-reg-5-2025-what-changes', 'id')

    expect(findMock).toHaveBeenCalledWith({
      collection: 'insights',
      where: {
        slug: { equals: 'bkpm-reg-5-2025-what-changes' },
        _status: { equals: 'published' },
      },
      locale: 'id',
      depth: 2,
      limit: 1,
    })
    expect(findMock.mock.calls[0]?.[0].where).not.toHaveProperty('status')
    expect(cacheMock).toHaveBeenLastCalledWith(
      expect.any(Function),
      ['insight', 'id', 'bkpm-reg-5-2025-what-changes'],
      {
        tags: [
          'insights:id',
          'insight:id:bkpm-reg-5-2025-what-changes',
          'insights:list',
          'insights:slug:bkpm-reg-5-2025-what-changes',
        ],
      },
    )
  })

  it('calls notFound only after a successful zero-document lookup', async () => {
    const { default: InsightDetailPage } = await import('./page')
    findMock.mockResolvedValueOnce({ docs: [] })

    await expect(
      InsightDetailPage({ params: Promise.resolve({ locale: 'en', slug: 'missing' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFoundMock).toHaveBeenCalledOnce()
  })

  it('propagates the original Payload error without converting it to notFound', async () => {
    const { default: InsightDetailPage } = await import('./page')
    const infrastructureError = new Error('postgres connection unavailable')
    findMock.mockRejectedValueOnce(infrastructureError)

    await expect(
      InsightDetailPage({ params: Promise.resolve({ locale: 'en', slug: 'article' }) }),
    ).rejects.toBe(infrastructureError)
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('propagates static-parameter query failures when static generation is enabled', async () => {
    const { generateStaticParams } = await import('./page')
    const infrastructureError = new Error('postgres connection unavailable')
    vi.stubEnv('JAKARTABC_BUILD_STATIC_INSIGHTS', 'true')
    findMock.mockRejectedValueOnce(infrastructureError)

    await expect(generateStaticParams()).rejects.toBe(infrastructureError)
  })
})
