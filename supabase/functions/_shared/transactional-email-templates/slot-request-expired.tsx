import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

interface SlotRequestExpiredProps {
  menteeName?: string
  mentorName?: string
  requestedDate?: string
  requestedTime?: string
}

const SlotRequestExpiredEmail = ({
  menteeName = 'there',
  mentorName = 'the mentor',
  requestedDate = '',
  requestedTime = '',
}: SlotRequestExpiredProps) => (
  <EmailLayout
    preview="Slot request expired – refund initiated"
    eyebrow="Request expired"
    title="Your slot request has expired"
  >
    <Text style={text}>Hello {menteeName},</Text>

    <Text style={text}>
      Your session request for <strong>{requestedDate}</strong> at <strong>{requestedTime}</strong> with <strong>{mentorName}</strong> has expired as the mentor did not respond within the 4-hour window.
    </Text>

    <InfoBox tone="green" label="Refund Status">
      <Text style={detailItem}>
        A full refund has been automatically initiated and will be credited to your original payment method within 5–7 business days.
      </Text>
    </InfoBox>

    <Text style={text}>
      We apologise for the inconvenience. Please try requesting a session with another mentor or at a different time.
    </Text>
    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: SlotRequestExpiredEmail,
  subject: 'Slot request expired – refund initiated',
  displayName: 'Slot Request – Expired (to Mentee)',
  previewData: { menteeName: 'Priya', mentorName: 'Rahul Sharma', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00' },
} satisfies TemplateEntry
