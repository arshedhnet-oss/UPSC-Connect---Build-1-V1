import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, CtaButton, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

const APP_URL = 'https://https-upscconnect-in.lovable.app'

interface ChatNewMessageProps {
  senderName?: string
  recipientName?: string
  messagePreview?: string
  timestamp?: string
  conversationId?: string
  senderRole?: string
}

const ChatNewMessageEmail = ({
  senderName = 'Someone',
  recipientName = 'there',
  messagePreview = '',
  timestamp = '',
  conversationId = '',
  senderRole = 'mentee',
}: ChatNewMessageProps) => (
  <EmailLayout
    preview={`New message from ${senderName} on ${SITE_NAME}`}
    eyebrow="New message"
    title={`New message from ${senderName}`}
  >
    <Text style={text}>Hello {recipientName},</Text>

    <Text style={text}>
      You have a new message from <strong>{senderName}</strong> ({senderRole}).
    </Text>

    <InfoBox tone="blue">
      <Text style={{ ...detailItem, whiteSpace: 'pre-wrap' as const, marginBottom: '8px' }}>
        {messagePreview}
      </Text>
      <Text style={{ ...detailItem, fontSize: '12px', color: '#9ca3af', margin: '0' }}>
        {timestamp}
      </Text>
    </InfoBox>

    <CtaButton href={`${APP_URL}/chat?conversation=${conversationId}`}>Reply Now</CtaButton>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: ChatNewMessageEmail,
  subject: (data: Record<string, any>) =>
    `New message from ${data.senderName || 'someone'} on UPSC Connect`,
  displayName: 'Chat – New Message',
  previewData: {
    senderName: 'Priya Gupta',
    recipientName: 'Rahul Sharma',
    messagePreview: 'Hi, I had a question about GS Paper 2 preparation strategy. Could you guide me on how to approach the syllabus?',
    timestamp: 'Apr 12, 2026 at 3:45 PM',
    conversationId: 'abc-123',
    senderRole: 'mentee',
  },
} satisfies TemplateEntry
