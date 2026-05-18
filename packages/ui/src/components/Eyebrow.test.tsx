import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Eyebrow } from './Eyebrow'

describe('Eyebrow', () => {
  it('renders uppercase tracked text', () => {
    render(<Eyebrow>foreign direct investment</Eyebrow>)

    const el = screen.getByText(/foreign direct investment/i)
    expect(el).toHaveClass('uppercase')
    expect(el.className).toMatch(/tracking-/)
  })

  it('forwards className', () => {
    render(<Eyebrow className="ml-2">x</Eyebrow>)

    expect(screen.getByText('x')).toHaveClass('ml-2')
  })

  it('forwards span attributes', () => {
    render(<Eyebrow data-testid="label">Services</Eyebrow>)

    expect(screen.getByTestId('label')).toHaveTextContent('Services')
  })
})
