import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { findMock } = vi.hoisted(() => ({
  findMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
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
  unstable_setRequestLocale: vi.fn(),
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
      where: { status: { equals: 'published' } },
      locale: 'id',
      depth: 1,
      limit: 50,
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

  it('falls back to the empty state when Payload is unavailable during build', async () => {
    const { default: InsightsListPage } = await import('./page')
    findMock.mockRejectedValueOnce(
      new Error('cannot connect to Postgres. Details: connect ECONNREFUSED 127.0.0.1:5432'),
    )

    render(await InsightsListPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(screen.getByText('No articles yet.')).toBeInTheDocument()
  })
})
