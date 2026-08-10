import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children as a button by default', () => {
    render(<Button>Book a call</Button>)
    const el = screen.getByRole('button', { name: /book a call/i })
    expect(el.tagName).toBe('BUTTON')
  })

  it('covers default, hover, focus, active, disabled, and loading states', () => {
    render(<Button loading>Send</Button>)
    const el = screen.getByRole('button', { name: /send/i })
    const classList = Array.from(el.classList)

    expect(classList).toEqual(expect.arrayContaining(['bg-navy-700', 'text-bone-50']))
    expect(classList).toEqual(expect.arrayContaining(['hover:bg-navy-800']))
    expect(classList).toEqual(
      expect.arrayContaining([
        'focus-visible:outline',
        'focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        'focus-visible:outline-navy-600',
      ]),
    )
    expect(classList).toEqual(
      expect.arrayContaining(['active:bg-navy-900', 'active:translate-y-px']),
    )
    expect(classList).toEqual(
      expect.arrayContaining(['disabled:bg-bone-200', 'disabled:text-ink-500']),
    )
    expect(el).toBeDisabled()
    expect(el).toHaveAttribute('aria-busy', 'true')
    expect(el.textContent).toMatch(/·/)
    expect(el.querySelector('[aria-hidden="true"]')).toHaveClass('animate-spin-slow', 'font-mono')
  })

  it('applies secondary variant when requested', () => {
    render(<Button variant="secondary">Learn more</Button>)
    const el = screen.getByRole('button', { name: /learn more/i })
    expect(el.className).toMatch(/border/)
    expect(el.className).toMatch(/text-navy-700/)
  })

  it('renders as an anchor when href is provided', () => {
    render(<Button href="/services">See services</Button>)
    const el = screen.getByRole('link', { name: /see services/i })
    expect(el.tagName).toBe('A')
    expect(el).toHaveAttribute('href', '/services')
  })

  it('is disabled when disabled prop set', () => {
    render(<Button disabled>Nope</Button>)
    expect(screen.getByRole('button', { name: /nope/i })).toBeDisabled()
  })
})
