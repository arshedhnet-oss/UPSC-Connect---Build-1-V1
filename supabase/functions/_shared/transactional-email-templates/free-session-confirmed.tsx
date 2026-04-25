import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

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
  <EmailLayout
    preview="Your free 1:1 session is confirmed"
    eyebrow="Session confirmed"
    title="Your free 1:1 session is confirmed"
  >
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

    <InfoBox tone="blue" label="Session Details">
      <Text style={detailItem}>Date: <strong>{sessionDate}</strong></Text>
      <Text style={detailItem}>Time: <strong>{sessionTime}</strong></Text>
      {audience !== 'mentee' && <Text style={detailItem}>Mentee: <strong>{menteeName}</strong></Text>}
      {audience !== 'mentor' && <Text style={detailItem}>Mentor: <strong>{mentorName}</strong></Text>}
    </InfoBox>

    <InfoBox tone="green" label="Join the Meeting">
      <Text style={detailItem}>Link: <strong>{meetingLink}</strong></Text>
      {meetingPasscode && <Text style={detailItem}>Passcode: <strong>{meetingPasscode}</strong></Text>}
    </InfoBox>

    {audience !== 'mentee' && (menteeEmail || menteePhone || menteeWhatsapp) && (
      <InfoBox tone="gray" label="Mentee Contact">
        {menteeEmail && <Text style={detailItem}>Email: {menteeEmail}</Text>}
        {menteePhone && <Text style={detailItem}>Phone: {menteePhone}</Text>}
        {menteeWhatsapp && <Text style={detailItem}>WhatsApp: {menteeWhatsapp}</Text>}
      </InfoBox>
    )}

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
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
