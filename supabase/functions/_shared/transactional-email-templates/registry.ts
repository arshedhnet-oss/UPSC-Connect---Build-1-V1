/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as adminMentorSignup } from './admin-mentor-signup.tsx'
import { template as adminMenteeSignup } from './admin-mentee-signup.tsx'
import { template as mentorWelcome } from './mentor-welcome.tsx'
import { template as mentorApproved } from './mentor-approved.tsx'
import { template as menteeWelcome } from './mentee-welcome.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-mentor-signup': adminMentorSignup,
  'admin-mentee-signup': adminMenteeSignup,
  'mentor-welcome': mentorWelcome,
  'mentor-approved': mentorApproved,
  'mentee-welcome': menteeWelcome,
}
