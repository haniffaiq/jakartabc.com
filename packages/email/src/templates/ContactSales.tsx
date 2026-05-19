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

export type ContactSalesProps = {
  messageId: string | number
  name: string
  email: string
  company?: string
  message: string
  locale: 'en' | 'id'
  siteUrl: string
}

export function ContactSales({
  messageId,
  name,
  email,
  company,
  message,
  locale,
  siteUrl,
}: ContactSalesProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New contact: ${name} (${company ?? '—'})`}</Preview>
      <Body style={{ background: '#FAF7F2', fontFamily: 'sans-serif', color: '#1A1815' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
          <Heading as="h1" style={{ fontFamily: 'serif', fontWeight: 400, fontSize: 28 }}>
            New contact message
          </Heading>
          <Text
            style={{
              marginTop: 4,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >{`#${messageId}`}</Text>
          <Section style={{ marginTop: 24 }}>
            <Text>
              <strong>Name: </strong>
              {name}
            </Text>
            <Text>
              <strong>Email: </strong>
              {email}
            </Text>
            <Text>
              <strong>Company: </strong>
              {company ?? '—'}
            </Text>
            <Text>
              <strong>Visitor locale: </strong>
              {locale.toUpperCase()}
            </Text>
          </Section>
          <Section style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Message
            </Text>
            <Text style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{message}</Text>
          </Section>
          <Section style={{ marginTop: 32 }}>
            <Link
              href={`${siteUrl}/admin/collections/contact-messages/${messageId}`}
              style={{ color: '#95701E' }}
            >
              Open in admin →
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ContactSales
