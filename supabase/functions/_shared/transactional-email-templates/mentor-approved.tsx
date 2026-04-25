import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, CtaButton, SITE_NAME,
  text, textBold, signature, reinforcement, checklistItem,
} from './_layout.tsx'

interface MentorApprovedProps {
  mentorName?: string
}

const MentorApprovedEmail = ({ mentorName = 'Mentor' }: MentorApprovedProps) => (
  <EmailLayout
    preview={`Your ${SITE_NAME} profile is now live`}
    eyebrow="Profile approved"
    title="Your profile is now live"
  >
    <Text style={text}>Hello {mentorName},</Text>

    <Text style={text}>
      Great news — your mentor profile on {SITE_NAME} has been reviewed and approved. Your profile is now live and visible to UPSC aspirants.
    </Text>

    <Text style={textBold}>You can now start receiving session bookings from mentees.</Text>

    <Text style={text}>
      To maximise your visibility and booking rate, make sure your profile is fully updated:
    </Text>

    <InfoBox tone="blue">
      <Text style={checklistItem}>• A clear and professional display picture</Text>
      <Text style={checklistItem}>• A focused bio highlighting your UPSC journey</Text>
      <Text style={checklistItem}>• Accurate session pricing</Text>
      <Text style={checklistItem}>• Up-to-date available time slots</Text>
    </InfoBox>

    <CtaButton href="https://upscconnect.in/dashboard">Go to Your Dashboard</CtaButton>

    <Text style={reinforcement}>
      Mentors with complete profiles and available slots tend to receive bookings faster and more consistently.
    </Text>

    <Text style={text}>
      Thank you for being part of {SITE_NAME}. We look forward to seeing the impact you create.
    </Text>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: MentorApprovedEmail,
  subject: 'Your UPSC Connect Profile Is Now Live',
  displayName: 'Mentor Approved',
  previewData: { mentorName: 'Rahul Sharma' },
} satisfies TemplateEntry
