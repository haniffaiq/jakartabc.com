import { render, screen } from '@testing-library/react'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'

import { Hero as ExportedHero } from '../index'
import { Hero } from './Hero'

describe('Hero', () => {
  it('renders eyebrow + headline + lead + primary CTA + secondary link', () => {
    render(
      <Hero
        eyebrow="FOREIGN DIRECT INVESTMENT · INDONESIA"
        headline="Set up a PT PMA in Indonesia."
        lead="Foreign-owned company registration handled by a Jakarta team."
        primary={{ label: 'Book a call', href: '/contact' }}
        secondary={{ label: 'See how it works', href: '/services' }}
      />,
    )

    expect(screen.getByText(/foreign direct investment/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Set up a PT PMA/)
    expect(screen.getByText(/Jakarta team/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Book a call/ })).toHaveAttribute('href', '/contact')
    expect(screen.getByRole('link', { name: 'See how it works' })).toHaveAttribute('href', '/services')
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
      <Hero
        eyebrow="FDI"
        headline="PT PMA setup."
        lead="Jakarta counsel for market entry."
        primary={{ label: 'Book', href: '/contact' }}
        Link={Link}
      />,
    )

    expect(screen.getByTestId('custom-link')).toHaveAttribute('href', '/contact')
  })

  it('has no background image, gradient, carousel, or media', () => {
    const { container } = render(
      <Hero eyebrow="x" headline="y" lead="z" primary={{ label: 'a', href: '/' }} data-testid="hero" />,
    )

    expect(container.querySelector('[style*="background-image"]')).toBeNull()
    expect(container.querySelector('img, video')).toBeNull()
    expect(container.querySelector('[aria-roledescription="carousel"]')).toBeNull()
    expect(Array.from(screen.getByTestId('hero').classList).some((className) => className.includes('gradient'))).toBe(
      false,
    )
  })

  it('exports Hero from the package entrypoint', () => {
    expect(ExportedHero).toBe(Hero)
  })
})
