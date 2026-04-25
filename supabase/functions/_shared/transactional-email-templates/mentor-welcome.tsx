import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, CtaButton, SITE_NAME,
  text, textBold, signature, reinforcement, checklistItem,
} from './_layout.tsx'

interface MentorWelcomeProps {
  mentorName?: string
}

const MentorWelcomeEmail = ({ mentorName = 'Mentor' }: MentorWelcomeProps) => (
  <EmailLayout
    preview={`Welcome to ${SITE_NAME} – Let's get your profile ready`}
    eyebrow="Welcome aboard"
    title={`Welcome, ${mentorName}`}
  >
    <Text style={text}>
      Welcome to {SITE_NAME}. We're really glad to have you with us.
    </Text>

    <Text style={text}>
      You are now part of a growing community of mentors helping UPSC aspirants navigate their preparation with the right guidance.
    </Text>

    <Text style={textBold}>To start receiving bookings, let's get your profile ready:</Text>

    <InfoBox tone="blue">
      <Text style={checklistItem}>• Add a clear and professional display picture</Text>
      <Text style={checklistItem}>• Write a concise and structured bio</Text>
      <Text style={checklistItem}>• Set your session pricing</Text>
      <Text style={checklistItem}>• Add your available time slots</Text>
    </InfoBox>

    <Text style={text}>
      Once completed, your profile will be reviewed and activated shortly (usually within 15 minutes). If you need faster approval, feel free to reach out at admin@upscconnect.in.
    </Text>

    <CtaButton href="https://upscconnect.in/dashboard">Complete Your Profile</CtaButton>

    <Text style={textBold}>Pro Tips – Mentors who receive more bookings usually:</Text>

    <InfoBox tone="amber">
      <Text style={checklistItem}>• Keep their bio clear, specific, and outcome-focused</Text>
      <Text style={checklistItem}>• Add multiple time slots for better availability</Text>
      <Text style={checklistItem}>• Use a professional and approachable profile photo</Text>
      <Text style={checklistItem}>• Respond quickly to mentee queries</Text>
    </InfoBox>

    <Text style={reinforcement}>
      A well-structured profile improves your visibility and helps mentees choose you with confidence.
    </Text>

    <Text style={text}>
      We're excited to have you onboard and look forward to the impact you'll create.
    </Text>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: MentorWelcomeEmail,
  subject: "Welcome to UPSC Connect – Let's Get Your Profile Ready",
  displayName: 'Mentor Welcome',
  previewData: { mentorName: 'Rahul Sharma' },
} satisfies TemplateEntry
