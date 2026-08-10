import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { cacheMock, findMock } = vi.hoisted(() => ({
  cacheMock: vi.fn((fn: () => unknown) => fn),
  findMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: cacheMock,
}))

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      eyebrow: 'INSIGHTS',
      headline: 'Editorial on Indonesian FDI, with citations.',
      lead: 'Long-form articles on regulations, sectors, and operational realities.',
      empty: 'No articles yet.',
    }

    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => ({ find: findMock })),
}))

vi.mock('@/components/LocalizedLink', () => ({
  LocalizedLink: ({
    href,
    className,
    children,
  }: {
    href: string
    className?: string
    children: React.ReactNode
  }) => React.createElement('a', { href, className }, children),
}))

describe('InsightsListPage', () => {
  beforeEach(() => {
    cacheMock.mockClear()
    findMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('queries published insights from Payload in the active locale', async () => {
    const { getInsights } = await import('./page')
    findMock.mockResolvedValueOnce({ docs: [] })

    await getInsights('id')

    expect(findMock).toHaveBeenCalledWith({
      collection: 'insights',
      sort: '-publishedAt',
      where: { _status: { equals: 'published' } },
      locale: 'id',
      depth: 1,
      limit: 50,
    })
    expect(findMock.mock.calls[0]?.[0].where).not.toHaveProperty('status')
    expect(cacheMock).toHaveBeenLastCalledWith(expect.any(Function), ['insights-list-id'], {
      tags: ['insights:id', 'insights:list'],
    })
  })

  it('renders Payload insight cards when articles are published', async () => {
    const { default: InsightsListPage } = await import('./page')
    findMock.mockResolvedValueOnce({
      docs: [
        {
          id: 'insight-1',
          slug: 'pma-capital-rule',
          title: 'PT PMA capital rules changed in 2026.',
          lead: 'What foreign investors should check before submitting OSS data.',
          publishedAt: '2026-05-18T08:00:00.000Z',
          estReadTime: 6,
          category: { name: 'Regulation' },
        },
      ],
    })

    render(await InsightsListPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Editorial on Indonesian FDI, with citations.',
    )
    expect(
      screen.getByRole('link', { name: 'PT PMA capital rules changed in 2026.' }),
    ).toHaveAttribute('href', '/insights/pma-capital-rule')
    expect(screen.getByText('Regulation')).toBeInTheDocument()
    expect(screen.getByText('6 min read')).toBeInTheDocument()
  })

  it('preserves the empty state when Payload has no published articles', async () => {
    const { default: InsightsListPage } = await import('./page')
    findMock.mockResolvedValueOnce({ docs: [] })

    render(await InsightsListPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(screen.getByText('No articles yet.')).toBeInTheDocument()
  })

  it('propagates Payload failures instead of rendering a false empty state', async () => {
    const { default: InsightsListPage } = await import('./page')
    const infrastructureError = new Error(
      'cannot connect to Postgres. Details: connect ECONNREFUSED 127.0.0.1:5432',
    )
    findMock.mockRejectedValueOnce(infrastructureError)

    await expect(InsightsListPage({ params: Promise.resolve({ locale: 'en' }) })).rejects.toBe(
      infrastructureError,
    )
  })
})
