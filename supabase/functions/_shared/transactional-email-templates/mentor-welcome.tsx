import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface MentorWelcomeProps {
  mentorName?: string
}

const MentorWelcomeEmail = ({ mentorName = 'Mentor' }: MentorWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} – Complete Your Profile to Start Receiving Bookings</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {mentorName},</Text>

        <Text style={text}>
          Welcome to {SITE_NAME}. We are glad to have you onboard as a mentor.
        </Text>

        <Text style={text}>
          You will soon be able to connect with UPSC aspirants seeking structured guidance based on your experience.
        </Text>

        <Text style={textBold}>
          To start receiving bookings, please complete your profile by ensuring the following:
        </Text>

        <Section style={checklistBox}>
          <Text style={checklistItem}>Add a clear display picture</Text>
          <Text style={checklistItem}>Write a short and focused bio</Text>
          <Text style={checklistItem}>Set your session pricing</Text>
          <Text style={checklistItem}>Add your available time slots</Text>
        </Section>

        <Text style={text}>
          Your profile will be active within 15 minutes. You may contact {SITE_NAME} (admin@upscconnect.in) for faster approval.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href="https://upscconnect.in/dashboard">
            Complete Your Profile
          </Button>
        </Section>

        <Text style={reinforcement}>
          Mentors with complete profiles tend to receive bookings faster and more consistently.
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          Thank you for being part of {SITE_NAME}.
        </Text>

        <Text style={signature}>
          Team {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MentorWelcomeEmail,
  subject: 'Welcome to UPSC Connect – Complete Your Profile to Start Receiving Bookings',
  displayName: 'Mentor Welcome',
  previewData: { mentorName: 'Rahul Sharma' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const textBold = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px', fontWeight: '600' as const }
const checklistBox = { backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid #1a3a7a' }
const checklistItem = { fontSize: '14px', color: '#374151', margin: '0 0 8px', paddingLeft: '8px' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#1a3a7a', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, padding: '12px 28px', borderRadius: '6px', textDecoration: 'none' }
const reinforcement = { fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 16px', fontStyle: 'italic' as const }
const signature = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0' }
