import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ContactForm } from './ContactForm'

const labels = {
  name: 'Name',
  email: 'Email',
  company: 'Company',
  message: 'Message',
  submit: 'Send',
  sending: 'Sending…',
}

describe('ContactForm', () => {
  it('renders 4 fields per DS §12', () => {
    render(<ContactForm labels={labels} state="idle" onSubmit={() => {}} />)

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Company')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
  })

  it('submits the entered contact fields as FormData', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ContactForm labels={labels} state="idle" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Name'), 'Ari Wijaya')
    await user.type(screen.getByLabelText('Email'), 'ari@example.com')
    await user.type(screen.getByLabelText('Company'), 'PT Nusantara')
    await user.type(screen.getByLabelText('Message'), 'I need help with a PT PMA setup.')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const data = onSubmit.mock.calls[0]?.[0] as FormData
    expect(data.get('name')).toBe('Ari Wijaya')
    expect(data.get('email')).toBe('ari@example.com')
    expect(data.get('company')).toBe('PT Nusantara')
    expect(data.get('message')).toBe('I need help with a PT PMA setup.')
  })

  it('uses accessible state copy for loading, success, and error', () => {
    const { rerender } = render(<ContactForm labels={labels} state="loading" onSubmit={() => {}} />)

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()

    rerender(
      <ContactForm
        labels={labels}
        state="error"
        errorMessage="Please enter a valid email."
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email.')

    rerender(
      <ContactForm
        labels={labels}
        state="success"
        successMessage="We will reply within one business day."
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('We will reply within one business day.')
  })
})
