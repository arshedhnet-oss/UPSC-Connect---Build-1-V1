import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'UPSC Connect'

interface AdminMentorSignupProps {
  mentorName?: string
  mentorEmail?: string
  mentorPhone?: string
  bio?: string
  pricing?: number
  airRank?: number | null
  rankYear?: number | null
}

const AdminMentorSignupEmail = ({
  mentorName = 'New Mentor',
  mentorEmail = '',
  mentorPhone = '',
  bio = '',
  pricing = 500,
  airRank,
  rankYear,
}: AdminMentorSignupProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Mentor Signup - Approval Required</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Hr style={hr} />
        <Text style={text}>Hello,</Text>
        <Text style={text}>
          A new mentor has signed up on {SITE_NAME} and is awaiting approval.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailLabel}>Name</Text>
          <Text style={detailValue}>{mentorName}</Text>

          <Text style={detailLabel}>Email</Text>
          <Text style={detailValue}>{mentorEmail}</Text>

          <Text style={detailLabel}>Phone</Text>
          <Text style={detailValue}>{mentorPhone}</Text>

          <Text style={detailLabel}>Bio</Text>
          <Text style={detailValue}>
            {bio.length > 200 ? bio.substring(0, 200) + '...' : bio}
          </Text>

          <Text style={detailLabel}>Session Pricing</Text>
          <Text style={detailValue}>Rs. {pricing}</Text>

          {airRank ? (
            <>
              <Text style={detailLabel}>AIR Rank</Text>
              <Text style={detailValue}>
                AIR {airRank}{rankYear ? ` (${rankYear})` : ''}
              </Text>
            </>
          ) : null}
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href="https://upscconnect.in/admin">
            Review and Approve Mentor
          </Button>
        </Section>

        <Text style={text}>
          Please review the profile at your earliest convenience to enable the mentor to start receiving bookings.
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
  component: AdminMentorSignupEmail,
  subject: 'New Mentor Signup - Approval Required',
  to: 'admin@upscconnect.in',
  displayName: 'Admin: New Mentor Signup',
  previewData: {
    mentorName: 'Rahul Sharma',
    mentorEmail: 'rahul@example.com',
    mentorPhone: '+919876543210',
    bio: 'UPSC CSE 2023 selected candidate with experience in mentoring aspirants for Geography Optional and Essay writing.',
    pricing: 799,
    airRank: 234,
    rankYear: 2023,
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
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#1a3a7a', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, padding: '12px 28px', borderRadius: '6px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '20px 0 0' }
