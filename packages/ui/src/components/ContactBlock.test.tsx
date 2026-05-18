import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ContactBlock } from './ContactBlock'

describe('ContactBlock', () => {
  it('renders partner name, role, email, WA', () => {
    render(
      <ContactBlock
        heading="Talk to a partner"
        partner={{
          name: 'Diah Putri',
          role: 'Senior Consultant',
          email: 'diah@jakartabc.com',
          whatsapp: '+62-21-555-1234',
        }}
      />,
    )

    expect(screen.getByText('Talk to a partner')).toBeInTheDocument()
    expect(screen.getByText('Diah Putri')).toBeInTheDocument()
    expect(screen.getByText('Senior Consultant')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /diah@jakartabc.com/i })).toHaveAttribute(
      'href',
      'mailto:diah@jakartabc.com',
    )
    expect(screen.getByRole('link', { name: /\+62-21-555-1234/i })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me'),
    )
  })

  it('omits WhatsApp link when no WhatsApp number is provided', () => {
    render(
      <ContactBlock
        heading="Contact"
        partner={{ name: 'Ari Wijaya', role: 'Partner', email: 'ari@jakartabc.com' }}
      />,
    )

    expect(screen.getByRole('link', { name: /ari@jakartabc.com/i })).toBeInTheDocument()
    expect(screen.queryByText('·')).toBeNull()
  })
})
