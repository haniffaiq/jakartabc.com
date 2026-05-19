import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export type BookingLeadVisitorProps = {
  name: string
  service: string
  locale: 'en' | 'id'
  partnerName: string
  partnerEmail: string
}

const COPY = {
  en: {
    preview: 'We received your request — Jakarta Business Center',
    subject: 'We received your request',
    greeting: (name: string) => `Hello ${name},`,
    body: (service: string) =>
      `Thank you for your interest in ${service}. We received your request and will reply within one business day.`,
    sig: (name: string, email: string) => `— ${name} (${email}), Jakarta Business Center`,
    legal: 'You are receiving this because you submitted a request at jakartabc.com.',
  },
  id: {
    preview: 'Kami menerima permintaan Anda — Jakarta Business Center',
    subject: 'Kami menerima permintaan Anda',
    greeting: (name: string) => `Halo ${name},`,
    body: (service: string) =>
      `Terima kasih atas minat Anda pada ${service}. Kami sudah menerima permintaan Anda dan akan membalas dalam 1 hari kerja.`,
    sig: (name: string, email: string) => `— ${name} (${email}), Jakarta Business Center`,
    legal: 'Anda menerima ini karena mengirim permintaan di jakartabc.com.',
  },
} as const

export function BookingLeadVisitor({
  name,
  service,
  locale,
  partnerName,
  partnerEmail,
}: BookingLeadVisitorProps) {
  const c = COPY[locale]

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body
        style={{
          background: '#FAF7F2',
          fontFamily: 'sans-serif',
          color: '#1A1815',
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
          <Heading as="h1" style={{ fontFamily: 'serif', fontWeight: 400, fontSize: 28 }}>
            {c.subject}
          </Heading>
          <Text style={{ marginTop: 24 }}>{c.greeting(name)}</Text>
          <Text style={{ marginTop: 12 }}>{c.body(service)}</Text>
          <Section style={{ marginTop: 32 }}>
            <Text>{c.sig(partnerName, partnerEmail)}</Text>
          </Section>
          <hr style={{ border: 0, borderTop: '1px solid rgba(26,24,21,0.08)', margin: '32px 0' }} />
          <Text style={{ fontSize: 12, color: '#6B6358' }}>{c.legal}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingLeadVisitor
