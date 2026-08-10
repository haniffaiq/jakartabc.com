import { render, screen } from '@testing-library/react'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'

import { FooterBlock as ExportedFooterBlock } from '../index'
import { FooterBlock } from './FooterBlock'

const props = {
  brand: 'jakartabc',
  address: ['Sudirman, Jakarta 12190', 'Indonesia'],
  email: 'hello@jakartabc.com',
  licenses: ['SIUP 001/2025', 'BKPM Licensed'],
  legalLinks: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ],
}

describe('FooterBlock', () => {
  it('renders brand, address, email, licenses, and legal links', () => {
    render(<FooterBlock {...props} />)

    expect(screen.getByText('jakartabc')).toBeInTheDocument()
    expect(screen.getByText('Sudirman, Jakarta 12190')).toBeInTheDocument()
    expect(screen.getByText('Indonesia')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /hello@jakartabc.com/i })).toHaveAttribute(
      'href',
      'mailto:hello@jakartabc.com',
    )
    expect(screen.getByText('SIUP 001/2025')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })

  it('applies dark variant as a clearly bounded footer band', () => {
    const { container } = render(<FooterBlock {...props} variant="dark" />)

    expect(container.firstChild).toHaveClass('bg-navy-900')
    expect(container.firstChild).toHaveClass('text-bone-100')
  })

  it('keeps the default light variant on bone with ink text', () => {
    const { container } = render(<FooterBlock {...props} />)

    expect(container.firstChild).toHaveClass('bg-bone-100')
    expect(container.firstChild).toHaveClass('text-ink-900')
  })

  it('renders supplied localized section headings', () => {
    render(
      <FooterBlock
        {...props}
        labels={{ office: 'Kantor', contact: 'Kontak', licenses: 'Perizinan' }}
      />,
    )

    expect(screen.getByText('Kantor')).toBeInTheDocument()
    expect(screen.getByText('Kontak')).toBeInTheDocument()
    expect(screen.getByText('Perizinan')).toBeInTheDocument()
    expect(screen.queryByText('Office')).toBeNull()
  })

  it('accepts a framework link component for legal links', () => {
    function Link({
      href,
      className,
      children,
    }: {
      href: string
      className?: string
      children: React.ReactNode
    }) {
      return (
        <a href={href} className={className} data-testid="custom-link">
          {children}
        </a>
      )
    }

    render(<FooterBlock {...props} Link={Link} />)

    expect(screen.getAllByTestId('custom-link')).toHaveLength(2)
  })

  it('exports FooterBlock from the package entrypoint', () => {
    expect(ExportedFooterBlock).toBe(FooterBlock)
  })
})
