import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

interface SlotRequestAcceptedProps {
  menteeName?: string
  mentorName?: string
  requestedDate?: string
  requestedTime?: string
  meetingLink?: string
  meetingPasscode?: string
  mentorMessage?: string | null
}

const SlotRequestAcceptedEmail = ({
  menteeName = 'there',
  mentorName = 'your mentor',
  requestedDate = '',
  requestedTime = '',
  meetingLink = '',
  meetingPasscode = '',
  mentorMessage,
}: SlotRequestAcceptedProps) => (
  <EmailLayout
    preview="Your slot request has been accepted!"
    eyebrow="Request accepted"
    title="Your session is confirmed"
  >
    <Text style={text}>Hello {menteeName},</Text>

    <Text style={text}>
      Great news! <strong>{mentorName}</strong> has accepted your session request.
    </Text>

    {mentorMessage && (
      <InfoBox tone="purple" label={`Message from ${mentorName}`}>
        <Text style={{ ...detailItem, fontStyle: 'italic' as const }}>"{mentorMessage}"</Text>
      </InfoBox>
    )}

    <InfoBox tone="blue" label="Session Details">
      <Text style={detailItem}>Date: <strong>{requestedDate}</strong></Text>
      <Text style={detailItem}>Time: <strong>{requestedTime}</strong></Text>
    </InfoBox>

    <InfoBox tone="green" label="Meeting Details">
      <Text style={detailItem}>Link: <strong>{meetingLink}</strong></Text>
      {meetingPasscode && <Text style={detailItem}>Passcode: <strong>{meetingPasscode}</strong></Text>}
    </InfoBox>

    <Text style={text}>Please join the meeting at the scheduled time. We wish you a productive session!</Text>
    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: SlotRequestAcceptedEmail,
  subject: 'Your slot request has been accepted!',
  displayName: 'Slot Request – Accepted (to Mentee)',
  previewData: { menteeName: 'Priya', mentorName: 'Rahul Sharma', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', meetingLink: 'https://meet.jit.si/abc-defg-hijk', meetingPasscode: '123456', mentorMessage: 'Looking forward to our session! Please come prepared with your essay drafts.' },
} satisfies TemplateEntry
