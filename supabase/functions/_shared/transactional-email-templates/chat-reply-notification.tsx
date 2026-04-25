import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, CtaButton, SITE_NAME,
  text, signature, detailItem,
} from './_layout.tsx'

const APP_URL = 'https://https-upscconnect-in.lovable.app'

interface ChatReplyProps {
  mentorName?: string
  menteeName?: string
  messagePreview?: string
  timestamp?: string
  conversationId?: string
}

const ChatReplyNotificationEmail = ({
  mentorName = 'Your Mentor',
  menteeName = 'there',
  messagePreview = '',
  timestamp = '',
  conversationId = '',
}: ChatReplyProps) => (
  <EmailLayout
    preview={`New reply from ${mentorName} on ${SITE_NAME}`}
    eyebrow="New reply"
    title={`Reply from ${mentorName}`}
  >
    <Text style={text}>Hello {menteeName},</Text>

    <Text style={text}>
      <strong>{mentorName}</strong> has replied to your message.
    </Text>

    <InfoBox tone="blue">
      <Text style={{ ...detailItem, whiteSpace: 'pre-wrap' as const, marginBottom: '8px' }}>
        {messagePreview}
      </Text>
      <Text style={{ ...detailItem, fontSize: '12px', color: '#9ca3af', margin: '0' }}>
        {timestamp}
      </Text>
    </InfoBox>

    <CtaButton href={`${APP_URL}/chat?conversation=${conversationId}`}>View Reply</CtaButton>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: ChatReplyNotificationEmail,
  subject: (data: Record<string, any>) =>
    `You have a new reply from ${data.mentorName || 'your mentor'} on UPSC Connect`,
  displayName: 'Chat – Reply Notification',
  previewData: {
    mentorName: 'Rahul Sharma',
    menteeName: 'Priya Gupta',
    messagePreview: 'Sure, I would recommend starting with the NCERT books for a strong foundation. Let me share a detailed roadmap...',
    timestamp: 'Apr 12, 2026 at 4:00 PM',
    conversationId: 'abc-123',
  },
} satisfies TemplateEntry
