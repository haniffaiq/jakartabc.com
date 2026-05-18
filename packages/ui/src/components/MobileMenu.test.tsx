import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MobileMenu as ExportedMobileMenu } from '../index'
import { MobileMenu, type MobileMenuLinkProps } from './MobileMenu'

const items = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
]

const baseProps = {
  brand: 'jakartabc',
  items,
  cta: { label: 'Book consultation', href: '/contact' },
  locale: 'en' as const,
  onLocaleChange: () => {},
}

function TestLink({ href, className, children }: MobileMenuLinkProps) {
  return (
    <a href={`/en${href}`} className={className} data-testid="localized-link">
      {children}
    </a>
  )
}

afterEach(() => {
  document.body.style.overflow = ''
})

describe('MobileMenu', () => {
  it('renders nothing when closed', () => {
    render(<MobileMenu {...baseProps} open={false} onClose={() => {}} />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders a full-screen dialog when open', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    expect(screen.getByRole('dialog', { name: /menu/i })).toBeInTheDocument()
    expect(screen.getByText('jakartabc')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Services' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Book consultation' })).toBeInTheDocument()
  })

  it('calls onClose from the close button and Escape key', () => {
    const onClose = vi.fn()
    render(<MobileMenu {...baseProps} open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    expect(document.body.style.overflow).toBe('hidden')

    rerender(<MobileMenu {...baseProps} open={false} onClose={() => {}} />)

    expect(document.body.style.overflow).toBe('')
  })

  it('toggles locale to the opposite locale', () => {
    const onLocaleChange = vi.fn()
    render(<MobileMenu {...baseProps} open onClose={() => {}} onLocaleChange={onLocaleChange} />)

    fireEvent.click(screen.getByRole('button', { name: /switch to indonesian/i }))

    expect(onLocaleChange).toHaveBeenCalledWith('id')
  })

  it('covers DS §20 mobile nav and CTA state classes', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    const servicesLink = screen.getByRole('link', { name: 'Services' })
    expect(servicesLink.className).toContain('hover:text-ochre-700')
    expect(servicesLink.className).toContain('active:text-ochre-700')
    expect(servicesLink.className).toContain('focus-visible:outline-ochre-600')

    const ctaLink = screen.getByRole('link', { name: 'Book consultation' })
    expect(ctaLink.className).toContain('bg-ochre-600')
    expect(ctaLink.className).toContain('hover:bg-ochre-700')
    expect(ctaLink.className).toContain('active:bg-ochre-700')
    expect(ctaLink.className).toContain('focus-visible:outline-ochre-600')
  })

  it('supports injectable locale-aware links', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} Link={TestLink} />)

    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/en/services')
    expect(screen.getByRole('link', { name: 'Book consultation' })).toHaveAttribute(
      'href',
      '/en/contact',
    )
  })

  it('exports MobileMenu from the package entrypoint', () => {
    expect(ExportedMobileMenu).toBe(MobileMenu)
  })
})
