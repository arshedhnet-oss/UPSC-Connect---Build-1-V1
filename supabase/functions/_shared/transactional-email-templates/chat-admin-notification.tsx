import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'
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
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Chat activity: {senderName} messaged {recipientName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME} – Admin Alert</Heading>
        <Hr style={hr} />

        <Text style={text}>New chat activity on the platform:</Text>

        <Section style={detailBox}>
          <Text style={detailLabel}>Message Details</Text>
          <Text style={detailItem}>👤 From: <strong>{senderName}</strong> ({senderRole})</Text>
          <Text style={detailItem}>👤 To: <strong>{recipientName}</strong></Text>
          <Text style={detailItem}>🕐 Time: <strong>{timestamp}</strong></Text>
        </Section>

        <Section style={chatBubble}>
          <Text style={chatText}>{messagePreview}</Text>
        </Section>

        <Section style={ctaSection}>
          <Button
            style={ctaButton}
            href={`${APP_URL}/chat?conversation=${conversationId}`}
          >
            View Conversation
          </Button>
        </Section>

        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
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

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailBox = { backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 16px', borderLeft: '4px solid #1a3a7a' }
const detailLabel = { fontSize: '14px', fontWeight: '600' as const, color: '#1a3a7a', margin: '0 0 8px' }
const detailItem = { fontSize: '14px', color: '#374151', margin: '0 0 6px', lineHeight: '1.5' }
const chatBubble = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '12px 16px', margin: '0 0 20px', border: '1px solid #e5e7eb' }
const chatText = { fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: '0', whiteSpace: 'pre-wrap' as const }
const ctaSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const ctaButton = { backgroundColor: '#1a3a7a', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, padding: '12px 32px', borderRadius: '8px', textDecoration: 'none' }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
