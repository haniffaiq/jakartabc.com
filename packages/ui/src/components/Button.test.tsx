import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children as a button by default', () => {
    render(<Button>Book a call</Button>)
    const el = screen.getByRole('button', { name: /book a call/i })
    expect(el.tagName).toBe('BUTTON')
  })

  it('applies primary variant classes by default (ochre bg, bone text)', () => {
    render(<Button>Primary</Button>)
    const el = screen.getByRole('button', { name: /primary/i })
    expect(el.className).toMatch(/bg-ochre-600/)
    expect(el.className).toMatch(/text-bone-50/)
  })

  it('applies secondary variant when requested', () => {
    render(<Button variant="secondary">Learn more</Button>)
    const el = screen.getByRole('button', { name: /learn more/i })
    expect(el.className).toMatch(/border/)
    expect(el.className).toMatch(/text-ink-900/)
  })

  it('renders as an anchor when href is provided', () => {
    render(<Button href="/services">See services</Button>)
    const el = screen.getByRole('link', { name: /see services/i })
    expect(el.tagName).toBe('A')
    expect(el).toHaveAttribute('href', '/services')
  })

  it('shows loading indicator and disables interaction when loading', () => {
    render(<Button loading>Send</Button>)
    const el = screen.getByRole('button', { name: /send/i })
    expect(el).toBeDisabled()
    expect(el).toHaveAttribute('aria-busy', 'true')
    expect(el.textContent).toMatch(/·/)
  })

  it('is disabled when disabled prop set', () => {
    render(<Button disabled>Nope</Button>)
    expect(screen.getByRole('button', { name: /nope/i })).toBeDisabled()
  })
})
