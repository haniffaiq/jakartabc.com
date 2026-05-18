import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DisplayHeading } from './DisplayHeading'

describe('DisplayHeading', () => {
  it('renders semantic level with h1 by default and customizable h2', () => {
    const { rerender } = render(<DisplayHeading>Hello</DisplayHeading>)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    rerender(<DisplayHeading as="h2">Hello</DisplayHeading>)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('applies size variants', () => {
    const { rerender } = render(<DisplayHeading size="xl">x</DisplayHeading>)
    expect(screen.getByRole('heading')).toHaveClass('text-display-xl')

    rerender(<DisplayHeading size="md">x</DisplayHeading>)
    expect(screen.getByRole('heading')).toHaveClass('text-display-md')
  })

  it('uses display serif font', () => {
    render(<DisplayHeading>x</DisplayHeading>)

    expect(screen.getByRole('heading')).toHaveClass('font-display')
  })
})
