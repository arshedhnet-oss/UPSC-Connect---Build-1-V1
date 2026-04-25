import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

interface SlotRequestAdminProps {
  event?: string
  mentorName?: string
  menteeName?: string
  requestedDate?: string
  requestedTime?: string
  details?: string
}

const SlotRequestAdminEmail = ({
  event = 'Slot Request Update',
  mentorName = '',
  menteeName = '',
  requestedDate = '',
  requestedTime = '',
  details = '',
}: SlotRequestAdminProps) => (
  <EmailLayout
    preview={`[Admin] ${event}`}
    eyebrow="Admin alert"
    title={event}
  >
    <InfoBox tone="blue">
      <Text style={detailItem}>Mentor: <strong>{mentorName}</strong></Text>
      <Text style={detailItem}>Mentee: <strong>{menteeName}</strong></Text>
      <Text style={detailItem}>Date: <strong>{requestedDate}</strong></Text>
      <Text style={detailItem}>Time: <strong>{requestedTime}</strong></Text>
      {details && <Text style={detailItem}>Notes: {details}</Text>}
    </InfoBox>

    <Text style={text}>Please check the admin dashboard for full details.</Text>
    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: SlotRequestAdminEmail,
  subject: (data: Record<string, any>) => `[Admin] ${data.event || 'Slot Request Update'}`,
  displayName: 'Slot Request – Admin Alert',
  previewData: { event: 'New Slot Request Created', mentorName: 'Rahul Sharma', menteeName: 'Priya Gupta', requestedDate: 'Mon, Jan 15, 2025', requestedTime: '10:00 – 11:00', details: 'Payment confirmed. Awaiting mentor response.' },
} satisfies TemplateEntry
