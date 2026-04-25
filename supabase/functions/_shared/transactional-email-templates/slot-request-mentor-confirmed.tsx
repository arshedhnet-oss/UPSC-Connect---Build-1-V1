import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

interface Props {
  mentorName?: string
  menteeName?: string
  requestedDate?: string
  requestedTime?: string
  meetingLink?: string
  meetingPasscode?: string
}

const SlotRequestMentorConfirmedEmail = ({
  mentorName = 'Mentor',
  menteeName = 'the mentee',
  requestedDate = '',
  requestedTime = '',
  meetingLink = '',
  meetingPasscode = '',
}: Props) => (
  <EmailLayout
    preview="You accepted a slot request"
    eyebrow="Session confirmed"
    title={`Session confirmed with ${menteeName}`}
  >
    <Text style={text}>Hello {mentorName},</Text>

    <Text style={text}>
      You have accepted the session request from <strong>{menteeName}</strong>. Here are the meeting details for your reference.
    </Text>

    <InfoBox tone="blue" label="Session Details">
      <Text style={detailItem}>Date: <strong>{requestedDate}</strong></Text>
      <Text style={detailItem}>Time: <strong>{requestedTime}</strong></Text>
    </InfoBox>

    <InfoBox tone="green" label="Meeting Details">
      <Text style={detailItem}>Link: <strong>{meetingLink}</strong></Text>
      {meetingPasscode && <Text style={detailItem}>Passcode: <strong>{meetingPasscode}</strong></Text>}
    </InfoBox>

    <Text style={text}>Please join the meeting at the scheduled time.</Text>
    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: SlotRequestMentorConfirmedEmail,
  subject: (data: Record<string, any>) => `Session confirmed with ${data.menteeName || 'mentee'}`,
  displayName: 'Slot Request – Confirmed (to Mentor)',
  previewData: { mentorName: 'Rahul Sharma', menteeName: 'Priya Gupta', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', meetingLink: 'https://meet.jit.si/abc-defg-hijk', meetingPasscode: '123456' },
} satisfies TemplateEntry
