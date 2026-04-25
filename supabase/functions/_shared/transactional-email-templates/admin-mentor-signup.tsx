import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, CtaButton, SITE_NAME,
  text, signature, detailKey, detailValue,
} from './_layout.tsx'

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
  <EmailLayout
    preview="New Mentor Signup – Approval Required"
    eyebrow="Admin alert"
    title="New mentor awaiting approval"
  >
    <Text style={text}>Hello,</Text>
    <Text style={text}>
      A new mentor has signed up on {SITE_NAME} and is awaiting approval.
    </Text>

    <InfoBox tone="gray">
      <Text style={detailKey}>Name</Text>
      <Text style={detailValue}>{mentorName}</Text>

      <Text style={detailKey}>Email</Text>
      <Text style={detailValue}>{mentorEmail}</Text>

      <Text style={detailKey}>Phone</Text>
      <Text style={detailValue}>{mentorPhone}</Text>

      <Text style={detailKey}>Bio</Text>
      <Text style={detailValue}>
        {bio.length > 200 ? bio.substring(0, 200) + '...' : bio}
      </Text>

      <Text style={detailKey}>Session Pricing</Text>
      <Text style={detailValue}>Rs. {pricing}</Text>

      {airRank ? (
        <>
          <Text style={detailKey}>AIR Rank</Text>
          <Text style={detailValue}>
            AIR {airRank}{rankYear ? ` (${rankYear})` : ''}
          </Text>
        </>
      ) : null}
    </InfoBox>

    <CtaButton href="https://upscconnect.in/admin">Review and Approve Mentor</CtaButton>

    <Text style={text}>
      Please review the profile at your earliest convenience to enable the mentor to start receiving bookings.
    </Text>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
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
