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

export type ContactVisitorProps = {
  name: string
  locale: 'en' | 'id'
  replyEmail: string
}

const COPY = {
  en: {
    preview: 'Thanks for reaching out — Jakarta Business Center',
    subject: 'Thanks for reaching out',
    body: (name: string) =>
      `Hi ${name},\n\nWe received your message and will reply within one business day. If urgent, you can also write directly to the address below.`,
    sig: (email: string) => `— Jakarta Business Center · ${email}`,
  },
  id: {
    preview: 'Terima kasih sudah menghubungi — Jakarta Business Center',
    subject: 'Terima kasih sudah menghubungi',
    body: (name: string) =>
      `Halo ${name},\n\nKami menerima pesan Anda dan akan membalas dalam 1 hari kerja. Bila mendesak, silakan kirim ke alamat di bawah.`,
    sig: (email: string) => `— Jakarta Business Center · ${email}`,
  },
} as const

export function ContactVisitor({ name, locale, replyEmail }: ContactVisitorProps) {
  const c = COPY[locale]

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={{ background: '#FAF7F2', fontFamily: 'sans-serif', color: '#1A1815' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
          <Heading as="h1" style={{ fontFamily: 'serif', fontWeight: 400, fontSize: 28 }}>
            {c.subject}
          </Heading>
          <Text style={{ marginTop: 24, whiteSpace: 'pre-wrap' }}>{c.body(name)}</Text>
          <Section style={{ marginTop: 32 }}>
            <Text>{c.sig(replyEmail)}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ContactVisitor
