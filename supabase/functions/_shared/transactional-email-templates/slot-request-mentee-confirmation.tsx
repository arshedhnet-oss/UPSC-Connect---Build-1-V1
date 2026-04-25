import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

interface Props {
  menteeName?: string
  mentorName?: string
  requestedDate?: string
  requestedTime?: string
}

const SlotRequestMenteeConfirmationEmail = ({
  menteeName = 'there',
  mentorName = 'the mentor',
  requestedDate = '',
  requestedTime = '',
}: Props) => (
  <EmailLayout
    preview="Your slot request has been submitted"
    eyebrow="Request submitted"
    title="Your slot request has been submitted"
  >
    <Text style={text}>Hello {menteeName},</Text>

    <Text style={text}>
      Your session request with <strong>{mentorName}</strong> has been submitted successfully.
    </Text>

    <InfoBox tone="blue" label="Session Details">
      <Text style={detailItem}>Date: <strong>{requestedDate}</strong></Text>
      <Text style={detailItem}>Time: <strong>{requestedTime}</strong></Text>
    </InfoBox>

    <Text style={text}>
      The mentor has <strong>4 hours</strong> to accept or decline your request. You'll be notified as soon as they respond. If they don't respond in time, a full refund will be initiated automatically.
    </Text>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: SlotRequestMenteeConfirmationEmail,
  subject: 'Your slot request has been submitted',
  displayName: 'Slot Request – Submitted (to Mentee)',
  previewData: { menteeName: 'Priya', mentorName: 'Rahul Sharma', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00' },
} satisfies TemplateEntry
