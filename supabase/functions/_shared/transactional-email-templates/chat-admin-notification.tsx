import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, CtaButton, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

const APP_URL = 'https://https-upscconnect-in.lovable.app'

interface ChatAdminNotificationProps {
  senderName?: string
  senderRole?: string
  recipientName?: string
  messagePreview?: string
  timestamp?: string
  conversationId?: string
}

const ChatAdminNotificationEmail = ({
  senderName = 'A user',
  senderRole = 'mentee',
  recipientName = 'Mentor',
  messagePreview = '',
  timestamp = '',
  conversationId = '',
}: ChatAdminNotificationProps) => (
  <EmailLayout
    preview={`Chat activity: ${senderName} messaged ${recipientName}`}
    eyebrow="Admin alert"
    title="New chat activity"
  >
    <Text style={text}>New chat activity on the platform:</Text>

    <InfoBox tone="blue" label="Message Details">
      <Text style={detailItem}>From: <strong>{senderName}</strong> ({senderRole})</Text>
      <Text style={detailItem}>To: <strong>{recipientName}</strong></Text>
      <Text style={detailItem}>Time: <strong>{timestamp}</strong></Text>
    </InfoBox>

    <InfoBox tone="gray">
      <Text style={{ ...detailItem, whiteSpace: 'pre-wrap' as const, margin: '0' }}>
        {messagePreview}
      </Text>
    </InfoBox>

    <CtaButton href={`${APP_URL}/chat?conversation=${conversationId}`}>View Conversation</CtaButton>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: ChatAdminNotificationEmail,
  subject: (data: Record<string, any>) =>
    `Chat: ${data.senderName || 'User'} → ${data.recipientName || 'User'}`,
  to: 'admin@upscconnect.in',
  displayName: 'Chat – Admin Notification',
  previewData: {
    senderName: 'Priya Gupta',
    senderRole: 'mentee',
    recipientName: 'Rahul Sharma',
    messagePreview: 'Hi, I had a question about GS Paper 2 preparation strategy.',
    timestamp: 'Apr 12, 2026 at 3:45 PM',
    conversationId: 'abc-123',
  },
} satisfies TemplateEntry
