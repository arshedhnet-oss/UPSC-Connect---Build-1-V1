import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface Props {
  mentorName?: string
  menteeName?: string
  requestedDate?: string
  requestedTime?: string
  meetingLink?: string
  meetingPasscode?: string
}

const SlotRequestMentorConfirmedEmail = ({ mentorName = 'Mentor', menteeName = 'the mentee', requestedDate = '', requestedTime = '', meetingLink = '', meetingPasscode = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You accepted a slot request</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {mentorName},</Text>

        <Text style={text}>
          You have accepted the session request from <strong>{menteeName}</strong>. Here are the meeting details for your reference.
        </Text>

        <Section style={detailBox}>
          <Text style={detailLabel}>Session Details</Text>
          <Text style={detailItem}>📅 Date: <strong>{requestedDate}</strong></Text>
          <Text style={detailItem}>🕐 Time: <strong>{requestedTime}</strong></Text>
        </Section>

        <Section style={meetingBox}>
          <Text style={meetingLabel}>Meeting Details</Text>
          <Text style={detailItem}>🔗 Link: <strong>{meetingLink}</strong></Text>
          {meetingPasscode && <Text style={detailItem}>🔑 Passcode: <strong>{meetingPasscode}</strong></Text>}
        </Section>

        <Text style={text}>Please join the meeting at the scheduled time.</Text>
        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SlotRequestMentorConfirmedEmail,
  subject: (data: Record<string, any>) => `Session confirmed with ${data.menteeName || 'mentee'}`,
  displayName: 'Slot Request – Confirmed (to Mentor)',
  previewData: { mentorName: 'Rahul Sharma', menteeName: 'Priya Gupta', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', meetingLink: 'https://meet.jit.si/abc-defg-hijk', meetingPasscode: '123456' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailBox = { backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #1a3a7a' }
const meetingBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #16a34a' }
const detailLabel = { fontSize: '14px', fontWeight: '600' as const, color: '#1a3a7a', margin: '0 0 8px' }
const meetingLabel = { fontSize: '14px', fontWeight: '600' as const, color: '#16a34a', margin: '0 0 8px' }
const detailItem = { fontSize: '14px', color: '#374151', margin: '0 0 6px', lineHeight: '1.5' }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
