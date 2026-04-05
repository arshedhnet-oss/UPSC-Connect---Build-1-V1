import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface MentorApprovedProps {
  mentorName?: string
}

const MentorApprovedEmail = ({ mentorName = 'Mentor' }: MentorApprovedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} profile is now live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {mentorName},</Text>

        <Text style={text}>
          Great news — your mentor profile on {SITE_NAME} has been reviewed and approved. Your profile is now live and visible to UPSC aspirants.
        </Text>

        <Text style={textBold}>
          You can now start receiving session bookings from mentees.
        </Text>

        <Text style={text}>
          To maximise your visibility and booking rate, make sure your profile is fully updated:
        </Text>

        <Section style={checklistBox}>
          <Text style={checklistItem}>A clear and professional display picture</Text>
          <Text style={checklistItem}>A focused bio highlighting your UPSC journey</Text>
          <Text style={checklistItem}>Accurate session pricing</Text>
          <Text style={checklistItem}>Up-to-date available time slots</Text>
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href="https://upscconnect.in/dashboard">
            Go to Your Dashboard
          </Button>
        </Section>

        <Text style={reinforcement}>
          Mentors with complete profiles and available slots tend to receive bookings faster and more consistently.
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          Thank you for being part of {SITE_NAME}. We look forward to seeing the impact you create.
        </Text>

        <Text style={signature}>
          Team {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MentorApprovedEmail,
  subject: 'Your UPSC Connect Profile Is Now Live',
  displayName: 'Mentor Approved',
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
