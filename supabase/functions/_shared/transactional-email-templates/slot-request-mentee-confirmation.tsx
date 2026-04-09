import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface Props {
  menteeName?: string
  mentorName?: string
  requestedDate?: string
  requestedTime?: string
}

const SlotRequestMenteeConfirmationEmail = ({ menteeName = 'there', mentorName = 'the mentor', requestedDate = '', requestedTime = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your slot request has been submitted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {menteeName},</Text>

        <Text style={text}>
          Your session request with <strong>{mentorName}</strong> has been submitted successfully.
        </Text>

        <Section style={detailBox}>
          <Text style={detailLabel}>Session Details</Text>
          <Text style={detailItem}>📅 Date: <strong>{requestedDate}</strong></Text>
          <Text style={detailItem}>🕐 Time: <strong>{requestedTime}</strong></Text>
        </Section>

        <Text style={text}>
          The mentor has <strong>4 hours</strong> to accept or decline your request. You'll be notified as soon as they respond. If they don't respond in time, a full refund will be initiated automatically.
        </Text>

        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SlotRequestMenteeConfirmationEmail,
  subject: 'Your slot request has been submitted',
  displayName: 'Slot Request – Submitted (to Mentee)',
  previewData: { menteeName: 'Priya', mentorName: 'Rahul Sharma', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00' },
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
