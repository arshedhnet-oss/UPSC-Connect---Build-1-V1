import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface Props {
  recipientName?: string
  audience?: 'mentee' | 'mentor' | 'admin'
  menteeName?: string
  mentorName?: string
  sessionDate?: string
  sessionTime?: string
  meetingLink?: string
  meetingPasscode?: string
  menteeEmail?: string
  menteePhone?: string
  menteeWhatsapp?: string
  sessionNumber?: number
}

const FreeSessionConfirmedEmail = ({
  recipientName = 'there',
  audience = 'mentee',
  menteeName = 'the mentee',
  mentorName = 'your mentor',
  sessionDate = '',
  sessionTime = '',
  meetingLink = '',
  meetingPasscode = '',
  menteeEmail = '',
  menteePhone = '',
  menteeWhatsapp = '',
  sessionNumber = 1,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your free 1:1 session is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {recipientName},</Text>

        {audience === 'mentee' && (
          <Text style={text}>
            Your free 1:1 session with <strong>{mentorName}</strong> has been scheduled. Below are the meeting details.
          </Text>
        )}
        {audience === 'mentor' && (
          <Text style={text}>
            A free 1:1 session has been booked with <strong>{menteeName}</strong>. Please join at the scheduled time.
          </Text>
        )}
        {audience === 'admin' && (
          <Text style={text}>
            A free 1:1 session has been booked. Details below (session #{sessionNumber} of 2 for this user).
          </Text>
        )}

        <Section style={detailBox}>
          <Text style={detailLabel}>Session Details</Text>
          <Text style={detailItem}>Date: <strong>{sessionDate}</strong></Text>
          <Text style={detailItem}>Time: <strong>{sessionTime}</strong></Text>
          {audience !== 'mentee' && <Text style={detailItem}>Mentee: <strong>{menteeName}</strong></Text>}
          {audience !== 'mentor' && <Text style={detailItem}>Mentor: <strong>{mentorName}</strong></Text>}
        </Section>

        <Section style={meetingBox}>
          <Text style={meetingLabel}>Join the Meeting</Text>
          <Text style={detailItem}>Link: <strong>{meetingLink}</strong></Text>
          {meetingPasscode && <Text style={detailItem}>Passcode: <strong>{meetingPasscode}</strong></Text>}
        </Section>

        {audience !== 'mentee' && (menteeEmail || menteePhone || menteeWhatsapp) && (
          <Section style={detailBox}>
            <Text style={detailLabel}>Mentee Contact</Text>
            {menteeEmail && <Text style={detailItem}>Email: {menteeEmail}</Text>}
            {menteePhone && <Text style={detailItem}>Phone: {menteePhone}</Text>}
            {menteeWhatsapp && <Text style={detailItem}>WhatsApp: {menteeWhatsapp}</Text>}
          </Section>
        )}

        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FreeSessionConfirmedEmail,
  subject: (data: Record<string, any>) => {
    if (data.audience === 'mentor') return `Free session booked with ${data.menteeName || 'a mentee'}`
    if (data.audience === 'admin') return `Free session booked – ${data.menteeName || 'mentee'}`
    return 'Your free 1:1 session is confirmed'
  },
  displayName: 'Free Session – Confirmed',
  previewData: {
    recipientName: 'Priya',
    audience: 'mentee',
    menteeName: 'Priya Gupta',
    mentorName: 'Rahul Sharma',
    sessionDate: 'Mon, Jan 15, 2025',
    sessionTime: '10:00 – 11:00',
    meetingLink: 'https://meet.jit.si/UPSC-abcd-1234',
    meetingPasscode: 'A1B2C3D4',
    sessionNumber: 1,
  },
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
