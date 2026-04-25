import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  EmailLayout, InfoBox, CtaButton, SITE_NAME,
  text, textBold, signature, reinforcement, checklistItem,
} from './_layout.tsx'

interface MenteeWelcomeProps {
  menteeName?: string
}

const MenteeWelcomeEmail = ({ menteeName = 'there' }: MenteeWelcomeProps) => (
  <EmailLayout
    preview={`Welcome to ${SITE_NAME} – Find the right guidance for your UPSC preparation`}
    eyebrow="Welcome aboard"
    title={`Welcome to ${SITE_NAME}, ${menteeName}`}
  >
    <Text style={text}>
      Preparing for the UPSC Civil Services Examination can be challenging without the right guidance.
    </Text>

    <Text style={text}>
      {SITE_NAME} helps you connect directly with experienced mentors, including UPSC toppers and serving officers.
    </Text>

    <Text style={textBold}>To get started:</Text>

    <InfoBox tone="blue">
      <Text style={checklistItem}>• Browse mentors based on your preparation needs</Text>
      <Text style={checklistItem}>• Review their experience and subjects</Text>
      <Text style={checklistItem}>• Book a one-on-one session at a convenient time</Text>
    </InfoBox>

    <CtaButton href="https://upscconnect.in/mentors">Find a Mentor</CtaButton>

    <Text style={text}>
      If you are unsure where to begin, you can use the "Talk to a Mentor" option for initial guidance.
    </Text>

    <Text style={reinforcement}>
      Even a single focused session can help you gain clarity and avoid common preparation mistakes.
    </Text>

    <Text style={text}>
      We wish you the very best in your UPSC Civil Services Examination journey.
    </Text>

    <Text style={signature}>Team {SITE_NAME}</Text>
  </EmailLayout>
)

export const template = {
  component: MenteeWelcomeEmail,
  subject: 'Welcome to UPSC Connect – Find the Right Guidance for Your UPSC Civil Services Examination Preparation',
  displayName: 'Mentee Welcome',
  previewData: { menteeName: 'Priya' },
} satisfies TemplateEntry
