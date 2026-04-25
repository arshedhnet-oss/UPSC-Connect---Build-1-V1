import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

interface SlotRequestRejectedProps {
  menteeName?: string
  mentorName?: string
  requestedDate?: string
  requestedTime?: string
  refundInitiated?: boolean
  mentorMessage?: string | null
}

const SlotRequestRejectedEmail = ({
  menteeName = 'there',
  mentorName = 'the mentor',
  requestedDate = '',
  requestedTime = '',
  refundInitiated = false,
  mentorMessage,
}: SlotRequestRejectedProps) => (
  <EmailLayout
    preview="Slot request update"
    eyebrow="Request update"
    title="Your slot request was not accepted"
  >
    <Text style={text}>Hello {menteeName},</Text>

    <Text style={text}>
      Unfortunately, <strong>{mentorName}</strong> was unable to accept your session request for <strong>{requestedDate}</strong> at <strong>{requestedTime}</strong>.
    </Text>

    {mentorMessage && (
      <InfoBox tone="purple" label={`Message from ${mentorName}`}>
        <Text style={{ ...detailItem, fontStyle: 'italic' as const }}>"{mentorMessage}"</Text>
      </InfoBox>
    )}

    {refundInitiated ? (
      <InfoBox tone="green" label="Refund Status">
        <Text style={detailItem}>
          A full refund has been initiated and will be credited to your original payment method within 5–7 business days.
        </Text>
      </InfoBox>
    ) : (
      <InfoBox tone="amber" label="Refund Status">
        <Text style={detailItem}>
          Please contact our support team for refund assistance.
        </Text>
      </InfoBox>
    )}

    <Text style={text}>We encourage you to try requesting a slot with another mentor or at a different time.</Text>
    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: SlotRequestRejectedEmail,
  subject: 'Slot request update – not accepted',
  displayName: 'Slot Request – Rejected (to Mentee)',
  previewData: { menteeName: 'Priya', mentorName: 'Rahul Sharma', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', refundInitiated: true, mentorMessage: "I'm unavailable at this time due to prior commitments. Please try another slot." },
} satisfies TemplateEntry
