import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './Input'

describe('Input', () => {
  it('renders label associated with input via id', () => {
    render(<Input label="Email" name="email" />)
    const input = screen.getByLabelText(/email/i)
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('covers default, focus, active, disabled, and error states', () => {
    const { rerender } = render(<Input label="Email" name="email" helper="We never share." />)
    let input = screen.getByLabelText(/email/i)
    let classList = Array.from(input.classList)

    expect(classList).toEqual(
      expect.arrayContaining(['border-b', 'border-b-ink-500', 'text-ink-900']),
    )
    expect(classList).toEqual(
      expect.arrayContaining([
        'focus:border-b-2',
        'focus:border-b-ochre-600',
        'focus:outline-none',
      ]),
    )
    expect(classList).toContain('active:border-b-ochre-700')
    expect(screen.getByText(/we never share/i)).toBeInTheDocument()

    rerender(
      <Input label="Email" name="email" helper="We never share." error="Required" disabled />,
    )
    input = screen.getByLabelText(/email/i)
    classList = Array.from(input.classList)
    expect(classList).toEqual(
      expect.arrayContaining(['disabled:bg-bone-100', 'disabled:text-ink-500']),
    )
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('input-email-error'))
    expect(screen.queryByText(/we never share/i)).toBeNull()
    expect(screen.getByText(/required/i)).toHaveClass('text-danger')
  })

  it('renders helper text below input when no error is present', () => {
    render(<Input label="Email" name="email" helper="We never share." />)
    expect(screen.getByText(/we never share/i)).toBeInTheDocument()
  })

  it('forwards type and value props', () => {
    render(<Input label="Phone" name="phone" type="tel" defaultValue="+62" />)
    const input = screen.getByLabelText(/phone/i) as HTMLInputElement
    expect(input.type).toBe('tel')
    expect(input.value).toBe('+62')
  })
})
