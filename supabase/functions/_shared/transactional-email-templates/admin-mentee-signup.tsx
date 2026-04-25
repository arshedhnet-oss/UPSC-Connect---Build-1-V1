import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, SITE_NAME,
  text, signature, detailKey, detailValue,
} from './_layout.tsx'

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
  <EmailLayout
    preview={`New User Signup – ${SITE_NAME}`}
    eyebrow="Admin alert"
    title="New user signed up"
  >
    <Text style={text}>Hello,</Text>
    <Text style={text}>A new user has signed up on {SITE_NAME}.</Text>

    <InfoBox tone="gray">
      <Text style={detailKey}>Name</Text>
      <Text style={detailValue}>{menteeName}</Text>

      <Text style={detailKey}>Email</Text>
      <Text style={detailValue}>{menteeEmail}</Text>

      {menteePhone ? (
        <>
          <Text style={detailKey}>Phone</Text>
          <Text style={detailValue}>{menteePhone}</Text>
        </>
      ) : null}

      {signupTime ? (
        <>
          <Text style={detailKey}>Signup Time</Text>
          <Text style={detailValue}>{signupTime}</Text>
        </>
      ) : null}
    </InfoBox>

    <Text style={text}>This user is now active on the platform.</Text>
    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
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
