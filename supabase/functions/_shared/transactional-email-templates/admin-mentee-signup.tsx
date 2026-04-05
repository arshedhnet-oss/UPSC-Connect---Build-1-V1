import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface AdminMenteeSignupProps {
  menteeName?: string
  menteeEmail?: string
  menteePhone?: string
  signupTime?: string
}

const AdminMenteeSignupEmail = ({
  menteeName = 'New User',
  menteeEmail = '',
  menteePhone = '',
  signupTime = '',
}: AdminMenteeSignupProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New User Signup – {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />
        <Text style={text}>Hello,</Text>
        <Text style={text}>
          A new user has signed up on {SITE_NAME}.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailLabel}>Name</Text>
          <Text style={detailValue}>{menteeName}</Text>

          <Text style={detailLabel}>Email</Text>
          <Text style={detailValue}>{menteeEmail}</Text>

          {menteePhone ? (
            <>
              <Text style={detailLabel}>Phone</Text>
              <Text style={detailValue}>{menteePhone}</Text>
            </>
          ) : null}

          {signupTime ? (
            <>
              <Text style={detailLabel}>Signup Time</Text>
              <Text style={detailValue}>{signupTime}</Text>
            </>
          ) : null}
        </Section>

        <Text style={text}>
          This user is now active on the platform.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          This is an automated notification from {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminMenteeSignupEmail,
  subject: 'New User Signup – UPSC Connect',
  to: 'admin@upscconnect.in',
  displayName: 'Admin: New Mentee Signup',
  previewData: {
    menteeName: 'Priya Sharma',
    menteeEmail: 'priya@example.com',
    menteePhone: '+919876543210',
    signupTime: '2024-04-05 14:30 IST',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a3a7a', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px', margin: '0 0 24px' }
const detailLabel = { fontSize: '12px', fontWeight: '600' as const, color: '#6b7280', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const detailValue = { fontSize: '14px', color: '#111827', margin: '0 0 14px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '20px 0 0' }
