import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

interface SlotRequestNewProps {
  mentorName?: string
  menteeName?: string
  requestedDate?: string
  requestedTime?: string
  message?: string
}

const SlotRequestNewEmail = ({ mentorName = 'Mentor', menteeName = 'A mentee', requestedDate = '', requestedTime = '', message }: SlotRequestNewProps) => (
  <EmailLayout
    preview={`New slot request from ${menteeName}`}
    eyebrow="New request"
    title={`New slot request from ${menteeName}`}
  >
    <Text style={text}>Hello {mentorName},</Text>

    <Text style={text}>
      You have received a new session request from <strong>{menteeName}</strong>.
    </Text>

    <InfoBox tone="blue" label="Session Details">
      <Text style={detailItem}>Date: <strong>{requestedDate}</strong></Text>
      <Text style={detailItem}>Time: <strong>{requestedTime}</strong></Text>
      {message && <Text style={detailItem}>Message: {message}</Text>}
    </InfoBox>

    <Text style={text}>
      Please log in to your dashboard to <strong>accept or reject</strong> this request. You have <strong>4 hours</strong> to respond before it expires automatically.
    </Text>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: SlotRequestNewEmail,
  subject: (data: Record<string, any>) => `New slot request from ${data.menteeName || 'a mentee'}`,
  displayName: 'Slot Request – New (to Mentor)',
  previewData: { mentorName: 'Rahul Sharma', menteeName: 'Priya Gupta', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', message: 'I need help with GS Paper 2' },
} satisfies TemplateEntry
