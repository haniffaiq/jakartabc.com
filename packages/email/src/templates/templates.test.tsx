import { render } from '@react-email/components'
import { describe, expect, it } from 'vitest'

import { subjects } from '../i18n'
import { BookingLeadSales } from './BookingLeadSales'
import { BookingLeadVisitor } from './BookingLeadVisitor'
import { ContactSales } from './ContactSales'
import { ContactVisitor } from './ContactVisitor'

describe('email subjects', () => {
  it('provides sales and visitor subjects in both locales', () => {
    expect(subjects.bookingLeadSales('PT PMA Setup', 'Maria T')).toBe(
      '[Lead] PT PMA Setup — Maria T',
    )
    expect(subjects.bookingLeadVisitor.en).toBe(
      'We received your request — Jakarta Business Center',
    )
    expect(subjects.bookingLeadVisitor.id).toBe(
      'Kami menerima permintaan Anda — Jakarta Business Center',
    )
    expect(subjects.contactSales('Sari')).toBe('[Contact] Sari')
    expect(subjects.contactVisitor.en).toBe('Thanks for reaching out — Jakarta Business Center')
    expect(subjects.contactVisitor.id).toBe(
      'Terima kasih sudah menghubungi — Jakarta Business Center',
    )
  })
})

describe('email templates', () => {
  it('BookingLeadSales renders to HTML with all fields', async () => {
    const html = await render(
      <BookingLeadSales
        leadId={42}
        name="Maria T"
        email="m@t.co"
        company="Solstice KK"
        phone="+81-1"
        service="PT PMA Setup"
        preferredWindows={['mon-am', 'tue-pm']}
        message="Hello"
        locale="en"
        siteUrl="https://jakartabc.com"
      />,
    )

    expect(html).toContain('Maria T')
    expect(html).toContain('Solstice KK')
    expect(html).toContain('mon-am, tue-pm')
    expect(html).toContain('/admin/collections/booking-leads/42')
  })

  it('BookingLeadVisitor renders EN copy', async () => {
    const html = await render(
      <BookingLeadVisitor
        name="Maria"
        service="PT PMA Setup"
        locale="en"
        partnerName="Diah Putri"
        partnerEmail="diah@jakartabc.com"
      />,
    )

    expect(html).toContain('Hello Maria')
    expect(html).toContain('Diah Putri')
    expect(html).toContain('PT PMA Setup')
  })

  it('BookingLeadVisitor renders ID copy', async () => {
    const html = await render(
      <BookingLeadVisitor
        name="Budi"
        service="Pendirian PT PMA"
        locale="id"
        partnerName="Diah"
        partnerEmail="d@x.co"
      />,
    )

    expect(html).toContain('Halo Budi')
    expect(html).toContain('Pendirian PT PMA')
  })

  it('ContactSales renders sales notification fields', async () => {
    const html = await render(
      <ContactSales
        messageId={3}
        name="X"
        email="x@y"
        company="Z"
        message="msg"
        locale="en"
        siteUrl="https://x.com"
      />,
    )

    expect(html).toContain('New contact message')
    expect(html).toContain('/admin/collections/contact-messages/3')
  })

  it('ContactVisitor renders ID copy', async () => {
    const html = await render(
      <ContactVisitor name="Sari" locale="id" replyEmail="hello@jakartabc.com" />,
    )

    expect(html).toContain('Halo Sari')
    expect(html).toContain('hello@jakartabc.com')
  })
})
