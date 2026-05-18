import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NavBar } from './NavBar'

const items = [
  { label: 'Services', href: '/services' },
  { label: 'Insights', href: '/insights' },
  { label: 'About', href: '/about' },
]

describe('NavBar', () => {
  it('renders the logo wordmark and primary navigation items', () => {
    render(
      <NavBar
        brand="jakartabc"
        items={items}
        cta={{ label: 'Book', href: '/contact' }}
        locale="en"
        onLocaleChange={() => {}}
        onMobileOpen={() => {}}
      />,
    )

    expect(screen.getByRole('link', { name: 'jakartabc' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/services')
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('href', '/insights')
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  })

  it('renders the CTA as a link styled action', () => {
    render(
      <NavBar
        brand="jakartabc"
        items={items}
        cta={{ label: 'Book a call', href: '/contact' }}
        locale="en"
        onLocaleChange={() => {}}
        onMobileOpen={() => {}}
      />,
    )

    expect(screen.getByRole('link', { name: /book a call/i })).toHaveAttribute('href', '/contact')
  })

  it('renders locale toggle and calls the handler with the next locale', () => {
    const handler = vi.fn()

    render(
      <NavBar
        brand="jakartabc"
        items={items}
        cta={{ label: 'Book', href: '/contact' }}
        locale="en"
        onLocaleChange={handler}
        onMobileOpen={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /switch to indonesian/i }))

    expect(handler).toHaveBeenCalledWith('id')
  })

  it('opens the mobile menu via the menu button', () => {
    const handler = vi.fn()

    render(
      <NavBar
        brand="jakartabc"
        items={items}
        cta={{ label: 'Book', href: '/contact' }}
        locale="en"
        onLocaleChange={() => {}}
        onMobileOpen={handler}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('covers DS §20 nav link and CTA state classes', () => {
    render(
      <NavBar
        brand="jakartabc"
        items={items}
        cta={{ label: 'Book a call', href: '/contact' }}
        locale="en"
        onLocaleChange={() => {}}
        onMobileOpen={() => {}}
      />,
    )

    const servicesLink = screen.getByRole('link', { name: 'Services' })
    expect(servicesLink.className).toContain('hover:text-ochre-700')
    expect(servicesLink.className).toContain('active:text-ochre-700')
    expect(servicesLink.className).toContain('focus-visible:outline-ochre-600')

    const ctaLink = screen.getByRole('link', { name: /book a call/i })
    expect(ctaLink.className).toContain('bg-ochre-600')
    expect(ctaLink.className).toContain('hover:bg-ochre-700')
    expect(ctaLink.className).toContain('active:bg-ochre-700')
    expect(ctaLink.className).toContain('focus-visible:outline-ochre-600')

    const localeToggle = screen.getByRole('button', { name: /switch to indonesian/i })
    expect(localeToggle.className).toContain('hover:text-ink-900')
    expect(localeToggle.className).toContain('active:text-ochre-700')
    expect(localeToggle.className).toContain('focus-visible:outline-ochre-600')
  })

  it('uses the injected Link component for locale-aware routing', () => {
    function LocalizedLink({
      href,
      className,
      children,
    }: {
      href: string
      className?: string
      children: React.ReactNode
    }) {
      return (
        <a href={`/en${href === '/' ? '' : href}`} className={className}>
          {children}
        </a>
      )
    }

    render(
      <NavBar
        brand="jakartabc"
        items={items.slice(0, 1)}
        cta={{ label: 'Book', href: '/contact' }}
        locale="en"
        onLocaleChange={() => {}}
        onMobileOpen={() => {}}
        Link={LocalizedLink}
      />,
    )

    expect(screen.getByRole('link', { name: 'jakartabc' })).toHaveAttribute('href', '/en')
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/en/services')
    expect(screen.getByRole('link', { name: 'Book' })).toHaveAttribute('href', '/en/contact')
  })
})
