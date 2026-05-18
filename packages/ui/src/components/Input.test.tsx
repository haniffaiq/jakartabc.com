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

  it('renders helper text below input', () => {
    render(<Input label="Email" name="email" helper="We never share." />)
    expect(screen.getByText(/we never share/i)).toBeInTheDocument()
  })

  it('renders error text and applies danger border', () => {
    render(<Input label="Email" name="email" error="Required" />)
    const input = screen.getByLabelText(/email/i)
    expect(input.className).toMatch(/border-b-danger/)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })

  it('forwards type and value props', () => {
    render(<Input label="Phone" name="phone" type="tel" defaultValue="+62" />)
    const input = screen.getByLabelText(/phone/i) as HTMLInputElement
    expect(input.type).toBe('tel')
    expect(input.value).toBe('+62')
  })
})
