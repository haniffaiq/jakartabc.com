import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EditorialTimeline as ExportedEditorialTimeline } from '../index'
import { EditorialTimeline } from './EditorialTimeline'

const steps = [
  {
    week: 'Week 1',
    label: 'Name reservation & deed preparation',
    who: 'we' as const,
    docs: ['passport scan', 'address proof'],
  },
  { week: 'Week 2', label: 'Notarial deed signing', who: 'joint' as const },
  { week: 'Week 3', label: 'NPWP & OSS registration', who: 'you' as const, docs: ['KBLI choices'] },
]

describe('EditorialTimeline', () => {
  it('renders each step with week, label, doer, and docs', () => {
    render(
      <EditorialTimeline
        steps={steps}
        labels={{ we: 'We handle', joint: 'Joint', you: 'You provide' }}
      />,
    )

    expect(screen.getByText('Week 1')).toBeInTheDocument()
    expect(screen.getByText('Name reservation & deed preparation')).toBeInTheDocument()
    expect(screen.getByText(/passport scan/)).toBeInTheDocument()
    expect(screen.getByText(/address proof/)).toBeInTheDocument()
    expect(screen.getByText('We handle')).toBeInTheDocument()
    expect(screen.getByText('Joint')).toBeInTheDocument()
    expect(screen.getByText('You provide')).toBeInTheDocument()
  })

  it('uses a vertical editorial timeline rather than a flowchart/card grid', () => {
    render(
      <EditorialTimeline
        steps={steps}
        labels={{ we: 'We handle', joint: 'Joint', you: 'You provide' }}
        data-testid="timeline"
      />,
    )

    const timeline = screen.getByTestId('timeline')
    const classList = Array.from(timeline.classList)

    expect(timeline.tagName).toBe('OL')
    expect(classList).toContain('border-l')
    expect(classList).toContain('border-ink-900/15')
    expect(classList.some((className) => className.includes('grid'))).toBe(false)
    expect(classList.some((className) => className.includes('shadow'))).toBe(false)
  })

  it('exports EditorialTimeline from the package entrypoint', () => {
    expect(ExportedEditorialTimeline).toBe(EditorialTimeline)
  })
})
