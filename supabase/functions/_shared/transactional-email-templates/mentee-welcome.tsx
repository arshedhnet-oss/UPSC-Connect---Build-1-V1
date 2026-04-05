import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface MenteeWelcomeProps {
  menteeName?: string
}

const MenteeWelcomeEmail = ({ menteeName = 'there' }: MenteeWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} – Start Your UPSC Preparation with the Right Guidance</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />

        <Text style={text}>Hello {menteeName},</Text>

        <Text style={text}>Welcome to {SITE_NAME}.</Text>

        <Text style={text}>
          Preparing for the UPSC Civil Services Examination can often feel overwhelming without the right direction.
        </Text>

        <Text style={text}>
          {SITE_NAME} helps you connect directly with experienced mentors, including UPSC toppers and serving officers, for structured and practical guidance.
        </Text>

        <Text style={textBold}>To get started, here is what you can do:</Text>

        <Section style={checklistBox}>
          <Text style={checklistItem}>Browse available mentors based on your needs</Text>
          <Text style={checklistItem}>Review their experience and approach</Text>
          <Text style={checklistItem}>Book a one-on-one session at a convenient time</Text>
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href="https://upscconnect.in/mentors">
            Find a Mentor
          </Button>
        </Section>

        <Text style={reinforcement}>
          Even a single focused session can help you gain clarity and avoid common preparation mistakes.
        </Text>

        <Text style={text}>
          If you are unsure where to begin, you can use the "Talk to a Mentor" option for initial guidance.
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          We wish you the very best in your UPSC Civil Services Examination journey.
        </Text>

        <Text style={signature}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MenteeWelcomeEmail,
  subject: 'Welcome to UPSC Connect – Start Your UPSC Civil Services Examination Preparation with the Right Guidance',
  displayName: 'Mentee Welcome',
  previewData: { menteeName: 'Priya' },
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
