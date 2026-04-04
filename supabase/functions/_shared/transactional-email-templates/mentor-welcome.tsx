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
    <Preview>Welcome to {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />
        <Text style={text}>Hello {mentorName},</Text>
        <Text style={text}>
          Welcome to {SITE_NAME}. We are glad to have you onboard as a mentor.
        </Text>
        <Text style={text}>
          To start receiving session requests, please complete your profile by ensuring the following:
        </Text>

        <Section style={checklistBox}>
          <Text style={checklistItem}>Add a clear display picture</Text>
          <Text style={checklistItem}>Update your bio</Text>
          <Text style={checklistItem}>Set your session pricing</Text>
          <Text style={checklistItem}>Add your available time slots</Text>
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href="https://upscconnect.in/dashboard">
            Complete Your Profile
          </Button>
        </Section>

        <Text style={text}>
          Once your profile is reviewed and approved, you will be able to start receiving bookings.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Thank you for being part of {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MentorWelcomeEmail,
  subject: 'Welcome to UPSC Connect',
  displayName: 'Mentor Welcome',
  previewData: { mentorName: 'Rahul Sharma' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const checklistBox = { backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 24px', borderLeft: '4px solid #1a3a7a' }
const checklistItem = { fontSize: '14px', color: '#374151', margin: '0 0 8px', paddingLeft: '8px' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#1a3a7a', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, padding: '12px 28px', borderRadius: '6px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '20px 0 0' }
