import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EditorialQuote as ExportedEditorialQuote } from '../index'
import { EditorialQuote } from './EditorialQuote'

describe('EditorialQuote', () => {
  it('renders quote and attribution', () => {
    const quoteProps = {
      quote: 'They handled the BKPM filing in two weeks.',
      author: 'Maria Tanaka',
      role: 'Founder, Solstice KK',
    }

    render(<EditorialQuote {...quoteProps} />)

    expect(screen.getByText(/BKPM filing/)).toBeInTheDocument()
    expect(screen.getByText('Maria Tanaka')).toBeInTheDocument()
    expect(screen.getByText('Founder, Solstice KK')).toBeInTheDocument()
  })

  it('uses display serif font for quote', () => {
    const quoteProps = { quote: 'x', author: 'A', role: 'R' }

    render(<EditorialQuote {...quoteProps} />)

    expect(screen.getByText('x')).toHaveClass('font-display')
  })

  it('exports EditorialQuote from the package entrypoint', () => {
    expect(ExportedEditorialQuote).toBe(EditorialQuote)
  })
})
