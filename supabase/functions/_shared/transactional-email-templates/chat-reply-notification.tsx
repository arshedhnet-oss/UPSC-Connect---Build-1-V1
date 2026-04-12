import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'
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
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New reply from {mentorName} on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {menteeName},</Text>

        <Text style={text}>
          <strong>{mentorName}</strong> has replied to your message.
        </Text>

        <Section style={chatBubble}>
          <Text style={chatText}>{messagePreview}</Text>
          <Text style={chatTime}>{timestamp}</Text>
        </Section>

        <Section style={ctaSection}>
          <Button
            style={ctaButton}
            href={`${APP_URL}/chat?conversation=${conversationId}`}
          >
            View Reply
          </Button>
        </Section>

        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
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

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const chatBubble = { backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #1a3a7a' }
const chatText = { fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: '0 0 8px', whiteSpace: 'pre-wrap' as const }
const chatTime = { fontSize: '12px', color: '#9ca3af', margin: '0' }
const ctaSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const ctaButton = { backgroundColor: '#1a3a7a', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, padding: '12px 32px', borderRadius: '8px', textDecoration: 'none' }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
