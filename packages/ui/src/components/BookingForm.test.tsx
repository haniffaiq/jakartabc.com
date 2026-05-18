import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BookingForm } from './BookingForm'

const labels = {
  name: 'Name',
  email: 'Email',
  company: 'Company',
  phone: 'Phone',
  service: 'Service',
  preferredWindows: 'Preferred times',
  message: 'Message',
  submit: 'Send request',
  sending: 'Sending…',
}

const services = [
  { slug: 'pt-pma-setup', name: 'PT PMA Setup' },
  { slug: 'sector-licensing', name: 'Sector Licensing' },
]

describe('BookingForm (visual stub)', () => {
  it('renders all fields and submit button', () => {
    render(<BookingForm labels={labels} services={services} state="idle" onSubmit={() => {}} />)

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Company')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Service')).toBeInTheDocument()
    expect(screen.getByText('Preferred times')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send request' })).toBeInTheDocument()
  })

  it('submits the entered booking fields as FormData', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<BookingForm labels={labels} services={services} state="idle" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Name'), 'Ari Wijaya')
    await user.type(screen.getByLabelText('Email'), 'ari@example.com')
    await user.type(screen.getByLabelText('Company'), 'PT Nusantara')
    await user.type(screen.getByLabelText('Phone'), '+62 812 0000 0000')
    await user.selectOptions(screen.getByLabelText('Service'), 'pt-pma-setup')
    await user.click(screen.getByRole('checkbox', { name: 'Mon AM' }))
    await user.type(screen.getByLabelText('Message'), 'We need a PT PMA setup consultation.')
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const data = onSubmit.mock.calls[0]?.[0] as FormData
    expect(data.get('name')).toBe('Ari Wijaya')
    expect(data.get('email')).toBe('ari@example.com')
    expect(data.get('company')).toBe('PT Nusantara')
    expect(data.get('phone')).toBe('+62 812 0000 0000')
    expect(data.get('service')).toBe('pt-pma-setup')
    expect(data.get('preferredWindows')).toBe('mon-am')
    expect(data.get('message')).toBe('We need a PT PMA setup consultation.')
  })

  it('shows loading label when state=loading', () => {
    render(<BookingForm labels={labels} services={services} state="loading" onSubmit={() => {}} />)

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
  })

  it('renders inline success message when state=success', () => {
    render(
      <BookingForm
        labels={labels}
        services={services}
        state="success"
        successMessage="Thanks. We'll reply within 1 business day."
        onSubmit={() => {}}
      />,
    )

    expect(screen.queryByLabelText('Name')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent(/within 1 business day/)
  })

  it('renders inline error message when state=error', () => {
    render(
      <BookingForm
        labels={labels}
        services={services}
        state="error"
        errorMessage="Please choose a service."
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Please choose a service.')
  })
})
