import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface SlotRequestRejectedProps {
  menteeName?: string
  mentorName?: string
  requestedDate?: string
  requestedTime?: string
  refundInitiated?: boolean
  mentorMessage?: string | null
}

const SlotRequestRejectedEmail = ({ menteeName = 'there', mentorName = 'the mentor', requestedDate = '', requestedTime = '', refundInitiated = false, mentorMessage }: SlotRequestRejectedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Slot request update</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {menteeName},</Text>

        <Text style={text}>
          Unfortunately, <strong>{mentorName}</strong> was unable to accept your session request for <strong>{requestedDate}</strong> at <strong>{requestedTime}</strong>.
        </Text>

        {mentorMessage && (
          <Section style={messageBox}>
            <Text style={messageLabel}>Message from {mentorName}:</Text>
            <Text style={messageText}>"{mentorMessage}"</Text>
          </Section>
        )}

        {refundInitiated ? (
          <Section style={refundBox}>
            <Text style={detailLabel}>Refund Status</Text>
            <Text style={detailItem}>A full refund has been initiated and will be credited to your original payment method within 5-7 business days.</Text>
          </Section>
        ) : (
          <Section style={warningBox}>
            <Text style={detailLabel}>Refund Status</Text>
            <Text style={detailItem}>Please contact our support team for refund assistance.</Text>
          </Section>
        )}

        <Text style={text}>We encourage you to try requesting a slot with another mentor or at a different time.</Text>
        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SlotRequestRejectedEmail,
  subject: 'Slot request update – not accepted',
  displayName: 'Slot Request – Rejected (to Mentee)',
  previewData: { menteeName: 'Priya', mentorName: 'Rahul Sharma', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', refundInitiated: true, mentorMessage: "I'm unavailable at this time due to prior commitments. Please try another slot." },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const messageBox = { backgroundColor: '#faf5ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #7c3aed' }
const messageLabel = { fontSize: '13px', fontWeight: '600' as const, color: '#6b21a8', margin: '0 0 6px' }
const messageText = { fontSize: '14px', color: '#374151', fontStyle: 'italic' as const, margin: '0', lineHeight: '1.5' }
const refundBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #16a34a' }
const warningBox = { backgroundColor: '#fffbeb', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #d97706' }
const detailLabel = { fontSize: '14px', fontWeight: '600' as const, color: '#1a3a7a', margin: '0 0 8px' }
const detailItem = { fontSize: '14px', color: '#374151', margin: '0 0 6px', lineHeight: '1.5' }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
