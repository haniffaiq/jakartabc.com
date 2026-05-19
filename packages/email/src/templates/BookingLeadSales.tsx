import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export type BookingLeadSalesProps = {
  leadId: string | number
  name: string
  email: string
  company?: string
  phone?: string
  service: string
  preferredWindows: string[]
  message: string
  locale: 'en' | 'id'
  siteUrl: string
}

export function BookingLeadSales({
  leadId,
  name,
  email,
  company,
  phone,
  service,
  preferredWindows,
  message,
  locale,
  siteUrl,
}: BookingLeadSalesProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New lead: ${service} — ${name} (${company ?? '—'})`}</Preview>
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
            New booking lead
          </Heading>
          <Text
            style={{
              marginTop: 4,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#3A352E',
            }}
          >
            {`Lead #${leadId}`}
          </Text>

          <Section style={{ marginTop: 24 }}>
            <Row label="Name" value={name} />
            <Row label="Email" value={email} />
            <Row label="Company" value={company ?? '—'} />
            <Row label="Phone" value={phone ?? '—'} />
            <Row label="Service" value={service} />
            <Row
              label="Preferred windows"
              value={preferredWindows.length ? preferredWindows.join(', ') : '—'}
            />
            <Row label="Visitor locale" value={locale.toUpperCase()} />
          </Section>

          <Section style={{ marginTop: 24 }}>
            <Text
              style={{
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#3A352E',
              }}
            >
              Message
            </Text>
            <Text style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{message}</Text>
          </Section>

          <Section style={{ marginTop: 32 }}>
            <Link
              href={`${siteUrl}/admin/collections/booking-leads/${leadId}`}
              style={{ color: '#95701E', textDecoration: 'underline' }}
            >
              Open in admin →
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ margin: '6px 0' }}>
      <strong>{label}: </strong>
      {value}
    </Text>
  )
}

export default BookingLeadSales
