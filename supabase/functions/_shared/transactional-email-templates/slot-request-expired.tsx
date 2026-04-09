import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface SlotRequestExpiredProps {
  menteeName?: string
  mentorName?: string
  requestedDate?: string
  requestedTime?: string
}

const SlotRequestExpiredEmail = ({ menteeName = 'there', mentorName = 'the mentor', requestedDate = '', requestedTime = '' }: SlotRequestExpiredProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Slot request expired – refund initiated</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {menteeName},</Text>

        <Text style={text}>
          Your session request for <strong>{requestedDate}</strong> at <strong>{requestedTime}</strong> with <strong>{mentorName}</strong> has expired as the mentor did not respond within the 4-hour window.
        </Text>

        <Section style={refundBox}>
          <Text style={detailLabel}>Refund Status</Text>
          <Text style={detailItem}>✅ A full refund has been automatically initiated and will be credited to your original payment method within 5-7 business days.</Text>
        </Section>

        <Text style={text}>We apologise for the inconvenience. Please try requesting a session with another mentor or at a different time.</Text>
        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SlotRequestExpiredEmail,
  subject: 'Slot request expired – refund initiated',
  displayName: 'Slot Request – Expired (to Mentee)',
  previewData: { menteeName: 'Priya', mentorName: 'Rahul Sharma', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const refundBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #16a34a' }
const detailLabel = { fontSize: '14px', fontWeight: '600' as const, color: '#1a3a7a', margin: '0 0 8px' }
const detailItem = { fontSize: '14px', color: '#374151', margin: '0 0 6px', lineHeight: '1.5' }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
