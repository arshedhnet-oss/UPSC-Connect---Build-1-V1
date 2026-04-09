import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface SlotRequestAdminProps {
  event?: string
  mentorName?: string
  menteeName?: string
  requestedDate?: string
  requestedTime?: string
  details?: string
}

const SlotRequestAdminEmail = ({ event = 'Slot Request Update', mentorName = '', menteeName = '', requestedDate = '', requestedTime = '', details = '' }: SlotRequestAdminProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>[Admin] {event}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME} – Admin Alert</Heading>
        <Hr style={hr} />

        <Section style={alertBox}>
          <Text style={detailLabel}>{event}</Text>
        </Section>

        <Section style={detailBox}>
          <Text style={detailItem}>👤 Mentor: <strong>{mentorName}</strong></Text>
          <Text style={detailItem}>👤 Mentee: <strong>{menteeName}</strong></Text>
          <Text style={detailItem}>📅 Date: <strong>{requestedDate}</strong></Text>
          <Text style={detailItem}>🕐 Time: <strong>{requestedTime}</strong></Text>
          {details && <Text style={detailItem}>📝 {details}</Text>}
        </Section>

        <Text style={text}>Please check the admin dashboard for full details.</Text>
        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SlotRequestAdminEmail,
  subject: (data: Record<string, any>) => `[Admin] ${data.event || 'Slot Request Update'}`,
  displayName: 'Slot Request – Admin Alert',
  previewData: { event: 'New Slot Request Created', mentorName: 'Rahul Sharma', menteeName: 'Priya Gupta', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', details: 'Payment confirmed. Awaiting mentor response.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const alertBox = { backgroundColor: '#fef3c7', borderRadius: '8px', padding: '12px 20px', margin: '0 0 16px', borderLeft: '4px solid #d97706' }
const detailBox = { backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #1a3a7a' }
const detailLabel = { fontSize: '16px', fontWeight: '700' as const, color: '#92400e', margin: '0' }
const detailItem = { fontSize: '14px', color: '#374151', margin: '0 0 6px', lineHeight: '1.5' }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
