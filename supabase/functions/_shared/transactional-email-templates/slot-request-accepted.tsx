import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface SlotRequestAcceptedProps {
  menteeName?: string
  mentorName?: string
  requestedDate?: string
  requestedTime?: string
  meetingLink?: string
  meetingPasscode?: string
}

const SlotRequestAcceptedEmail = ({ menteeName = 'there', mentorName = 'your mentor', requestedDate = '', requestedTime = '', meetingLink = '', meetingPasscode = '' }: SlotRequestAcceptedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your slot request has been accepted!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {menteeName},</Text>

        <Text style={text}>
          Great news! <strong>{mentorName}</strong> has accepted your session request.
        </Text>

        <Section style={detailBox}>
          <Text style={detailLabel}>Session Details</Text>
          <Text style={detailItem}>📅 Date: <strong>{requestedDate}</strong></Text>
          <Text style={detailItem}>🕐 Time: <strong>{requestedTime}</strong></Text>
        </Section>

        <Section style={meetingBox}>
          <Text style={detailLabel}>Meeting Details</Text>
          <Text style={detailItem}>🔗 Link: <strong>{meetingLink}</strong></Text>
          {meetingPasscode && <Text style={detailItem}>🔑 Passcode: <strong>{meetingPasscode}</strong></Text>}
        </Section>

        <Text style={text}>Please join the meeting at the scheduled time. We wish you a productive session!</Text>
        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SlotRequestAcceptedEmail,
  subject: 'Your slot request has been accepted!',
  displayName: 'Slot Request – Accepted (to Mentee)',
  previewData: { menteeName: 'Priya', mentorName: 'Rahul Sharma', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', meetingLink: 'https://meet.jit.si/abc-defg-hijk', meetingPasscode: '123456' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailBox = { backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #1a3a7a' }
const meetingBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #16a34a' }
const detailLabel = { fontSize: '14px', fontWeight: '600' as const, color: '#1a3a7a', margin: '0 0 8px' }
const detailItem = { fontSize: '14px', color: '#374151', margin: '0 0 6px', lineHeight: '1.5' }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
