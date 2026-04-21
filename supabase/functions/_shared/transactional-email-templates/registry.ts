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
import { template as slotRequestNew } from './slot-request-new.tsx'
import { template as slotRequestAccepted } from './slot-request-accepted.tsx'
import { template as slotRequestRejected } from './slot-request-rejected.tsx'
import { template as slotRequestExpired } from './slot-request-expired.tsx'
import { template as slotRequestAdmin } from './slot-request-admin.tsx'
import { template as slotRequestMenteeConfirmation } from './slot-request-mentee-confirmation.tsx'
import { template as slotRequestMentorConfirmed } from './slot-request-mentor-confirmed.tsx'
import { template as chatNewMessage } from './chat-new-message.tsx'
import { template as chatReplyNotification } from './chat-reply-notification.tsx'
import { template as chatAdminNotification } from './chat-admin-notification.tsx'
import { template as freeSessionConfirmed } from './free-session-confirmed.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'free-session-confirmed': freeSessionConfirmed,
  'admin-mentor-signup': adminMentorSignup,
  'admin-mentee-signup': adminMenteeSignup,
  'mentor-welcome': mentorWelcome,
  'mentor-approved': mentorApproved,
  'mentee-welcome': menteeWelcome,
  'slot-request-new': slotRequestNew,
  'slot-request-accepted': slotRequestAccepted,
  'slot-request-rejected': slotRequestRejected,
  'slot-request-expired': slotRequestExpired,
  'slot-request-admin': slotRequestAdmin,
  'slot-request-mentee-confirmation': slotRequestMenteeConfirmation,
  'slot-request-mentor-confirmed': slotRequestMentorConfirmed,
  'chat-new-message': chatNewMessage,
  'chat-reply-notification': chatReplyNotification,
  'chat-admin-notification': chatAdminNotification,
}
