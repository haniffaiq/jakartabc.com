import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LangToggle as ExportedLangToggle } from '../index'
import { LangToggle } from './LangToggle'

describe('LangToggle', () => {
  it('renders EN · ID with the current locale highlighted', () => {
    render(<LangToggle current="en" onChange={() => {}} />)

    expect(screen.getByText('EN')).toHaveClass('text-ink-900')
    expect(screen.getByText('ID')).toHaveClass('text-ink-500')
  })

  it('covers nav-toggle hover, focus, and active classes', () => {
    render(<LangToggle current="id" onChange={() => {}} />)
    const toggle = screen.getByRole('button', { name: 'Switch to English' })
    expect(toggle.className).toContain('hover:text-ink-900')
    expect(toggle.className).toContain('active:text-ochre-700')
    expect(toggle.className).toContain('focus-visible:outline-ochre-600')
  })

  it('calls onChange with the opposite locale on click', () => {
    const onChange = vi.fn()
    render(<LangToggle current="en" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Indonesian' }))

    expect(onChange).toHaveBeenCalledWith('id')
  })

  it('exports LangToggle from the package entrypoint', () => {
    expect(ExportedLangToggle).toBe(LangToggle)
  })
})
