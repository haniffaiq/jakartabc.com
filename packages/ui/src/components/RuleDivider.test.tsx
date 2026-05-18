import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RuleDivider } from './RuleDivider'

describe('RuleDivider', () => {
  it('renders an hr with soft rule color', () => {
    const { container } = render(<RuleDivider />)
    const hr = container.querySelector('hr')

    expect(hr).not.toBeNull()
    expect(hr).toHaveClass('border-t')
    expect(hr).toHaveClass('border-ink-900/[0.08]')
  })

  it('supports firm weight', () => {
    const { container } = render(<RuleDivider weight="firm" />)

    expect(container.querySelector('hr')).toHaveClass('border-ink-900/15')
  })

  it('forwards className and hr attributes', () => {
    const { container } = render(<RuleDivider className="my-8" aria-label="Section break" />)
    const hr = container.querySelector('hr')

    expect(hr).toHaveClass('my-8')
    expect(hr).toHaveAttribute('aria-label', 'Section break')
  })
})
