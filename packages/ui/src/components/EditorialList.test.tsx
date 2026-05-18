import { render, screen } from '@testing-library/react'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'

import { EditorialList as ExportedEditorialList } from '../index'
import { EditorialList } from './EditorialList'

const items = [
  {
    slug: 'pt-pma-setup',
    title: 'PT PMA Setup',
    desc: 'Foreign-owned LLC registration, end to end.',
    timeline: '4–6 wks',
  },
  {
    slug: 'sector-licensing',
    title: 'Sector Licensing',
    desc: 'OSS, KBLI, sector-specific permits.',
    timeline: '2–8 wks',
  },
]

describe('EditorialList', () => {
  it('renders each item with index, title, desc, timeline, and read link', () => {
    render(<EditorialList items={items} hrefPrefix="/services" readLabel="Read" />)

    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PT PMA Setup' })).toBeInTheDocument()
    expect(screen.getByText(/Foreign-owned LLC/)).toBeInTheDocument()
    expect(screen.getByText('4–6 wks')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /read.*PT PMA Setup/i })).toHaveAttribute(
      'href',
      '/services/pt-pma-setup',
    )
  })

  it('keeps editorial list rhythm with rule dividers instead of cards', () => {
    render(<EditorialList items={items} hrefPrefix="/services/" readLabel="Read" data-testid="list" />)

    const list = screen.getByTestId('list')
    expect(list.tagName).toBe('OL')
    expect(list.className).toContain('max-w-container')
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /read.*Sector Licensing/i })).toHaveAttribute(
      'href',
      '/services/sector-licensing',
    )
    const divider = Array.from(list.querySelectorAll('div')).find((el) =>
      el.className.includes('border-ink-900/[0.08]'),
    )
    expect(divider?.className).toContain('border-t')
    expect(Array.from(list.querySelectorAll('[class]')).some((el) => el.className.includes('shadow'))).toBe(
      false,
    )
  })

  it('accepts a framework link component', () => {
    function Link({
      href,
      className,
      children,
      'aria-label': ariaLabel,
    }: {
      href: string
      className?: string
      children: React.ReactNode
      'aria-label'?: string
    }) {
      return (
        <a href={href} className={className} aria-label={ariaLabel} data-testid="custom-link">
          {children}
        </a>
      )
    }

    const firstItem = items[0]!

    render(<EditorialList items={[firstItem]} hrefPrefix="/services" readLabel="Read" Link={Link} />)

    expect(screen.getByTestId('custom-link')).toHaveAttribute('href', '/services/pt-pma-setup')
  })

  it('exports EditorialList from the package entrypoint', () => {
    expect(ExportedEditorialList).toBe(EditorialList)
  })
})
