import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface SlotRequestNewProps {
  mentorName?: string
  menteeName?: string
  requestedDate?: string
  requestedTime?: string
  message?: string
}

const SlotRequestNewEmail = ({ mentorName = 'Mentor', menteeName = 'A mentee', requestedDate = '', requestedTime = '', message }: SlotRequestNewProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New slot request from {menteeName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {mentorName},</Text>

        <Text style={text}>
          You have received a new session request from <strong>{menteeName}</strong>.
        </Text>

        <Section style={detailBox}>
          <Text style={detailLabel}>Session Details</Text>
          <Text style={detailItem}>📅 Date: <strong>{requestedDate}</strong></Text>
          <Text style={detailItem}>🕐 Time: <strong>{requestedTime}</strong></Text>
          {message && <Text style={detailItem}>💬 Message: {message}</Text>}
        </Section>

        <Text style={text}>
          Please log in to your dashboard to <strong>accept or reject</strong> this request. You have <strong>4 hours</strong> to respond before it expires automatically.
        </Text>

        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SlotRequestNewEmail,
  subject: (data: Record<string, any>) => `New slot request from ${data.menteeName || 'a mentee'}`,
  displayName: 'Slot Request – New (to Mentor)',
  previewData: { mentorName: 'Rahul Sharma', menteeName: 'Priya Gupta', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', message: 'I need help with GS Paper 2' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailBox = { backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #1a3a7a' }
const detailLabel = { fontSize: '14px', fontWeight: '600' as const, color: '#1a3a7a', margin: '0 0 8px' }
const detailItem = { fontSize: '14px', color: '#374151', margin: '0 0 6px', lineHeight: '1.5' }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
