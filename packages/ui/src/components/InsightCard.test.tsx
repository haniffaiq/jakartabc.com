import { render, screen } from '@testing-library/react'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'

import { InsightCard as ExportedInsightCard } from '../index'
import { InsightCard } from './InsightCard'

describe('InsightCard', () => {
  it('renders category, date, read time, title, lead, and link', () => {
    render(
      <InsightCard
        category="Regulation"
        date="2026-05-10"
        readTime={6}
        title="BKPM Reg 5/2025: What changes"
        lead="Minimum capital and licensing implications."
        href="/insights/bkpm-reg-5-2025"
      />,
    )

    expect(screen.getByText('Regulation')).toBeInTheDocument()
    expect(screen.getByText('May 10, 2026')).toBeInTheDocument()
    expect(screen.getByText(/6 min read/i)).toBeInTheDocument()
    expect(screen.getByText('Minimum capital and licensing implications.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /BKPM Reg 5\/2025/ })).toHaveAttribute(
      'href',
      '/insights/bkpm-reg-5-2025',
    )
  })

  it('accepts a framework link component', () => {
    function Link({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
      return (
        <a href={href} className={className} data-testid="custom-link">
          {children}
        </a>
      )
    }

    render(
      <InsightCard
        category="Guide"
        date="2026-06-01"
        readTime={4}
        title="PT PMA checklist"
        lead="Documents to prepare before setup."
        href="/insights/pt-pma-checklist"
        Link={Link}
      />,
    )

    expect(screen.getByTestId('custom-link')).toHaveAttribute('href', '/insights/pt-pma-checklist')
  })

  it('uses editorial hairline rhythm without thumbnails or shadows', () => {
    render(
      <InsightCard
        category="Guide"
        date="2026-06-01"
        readTime={4}
        title="PT PMA checklist"
        lead="Documents to prepare before setup."
        href="/insights/pt-pma-checklist"
        data-testid="card"
      />,
    )

    const classList = Array.from(screen.getByTestId('card').classList)
    expect(classList).toContain('border-t')
    expect(classList).toContain('border-ink-900/[0.08]')
    expect(classList).toContain('py-10')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(classList.some((className) => className.includes('shadow'))).toBe(false)
  })

  it('exports InsightCard from the package entrypoint', () => {
    expect(ExportedInsightCard).toBe(InsightCard)
  })
})
