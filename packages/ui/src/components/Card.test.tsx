import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card as ExportedCard } from '../index'
import { Card } from './Card'

describe('Card', () => {
  it('renders children inside an article by default', () => {
    render(
      <Card>
        <p>card body</p>
      </Card>,
    )
    const el = screen.getByText(/card body/i).closest('article')
    expect(el).not.toBeNull()
  })

  it('applies bone-100 bg + rule-soft border + md radius without shadow', () => {
    render(<Card data-testid="c">x</Card>)
    const classList = Array.from(screen.getByTestId('c').classList)
    expect(classList).toContain('bg-bone-100')
    expect(classList).toContain('border')
    expect(classList).toContain('border-rule-soft')
    expect(classList).toContain('rounded-md')
    expect(classList).toContain('p-32')
    expect(classList.some((className) => className.includes('shadow'))).toBe(false)
  })

  it('renders as the supplied element when as prop given', () => {
    render(
      <Card as="section" data-testid="c">
        x
      </Card>,
    )
    expect(screen.getByTestId('c').tagName).toBe('SECTION')
  })

  it('merges custom className', () => {
    render(
      <Card className="custom-x" data-testid="c">
        x
      </Card>,
    )
    expect(screen.getByTestId('c').className).toMatch(/custom-x/)
  })

  it('exports Card from the package entrypoint', () => {
    expect(ExportedCard).toBe(Card)
  })
})
