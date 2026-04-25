// Test-mode email sender — sends one copy of every transactional email
// template to a single recipient using realistic dummy data.
// Does NOT touch live triggers, schedules, or production recipients.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEST_RECIPIENT = 'arshedopera.21@gmail.com'

// Realistic dummy data for "Arshad" — overrides each template's previewData
// only for fields we want personalized. Templates fall back to their own
// previewData / defaults for everything else.
const SAMPLE = {
  menteeName: 'Arshad',
  mentorName: 'Rahul Sharma',
  requestedDate: 'Mon, Jan 15, 2025',
  requestedTime: '10:00 – 11:00',
  meetingLink: 'https://meet.google.com/abc-defg-hij',
  meetingPasscode: '',
  mentorMessage: 'Looking forward to our session, Arshad!',
  message: 'Hi! I would like guidance on GS Paper 2 strategy.',
  refundInitiated: true,
  // chat-specific
  senderName: 'Rahul Sharma',
  receiverName: 'Arshad',
  preview: 'Hi Arshad, sharing some notes from our last discussion…',
  // admin-signup specific
  name: 'Arshad',
  email: 'arshad.sample@example.com',
  phone: '+91 98765 43210',
  // free-session-confirmed specific
  sessionDate: 'Mon, Jan 15, 2025',
  sessionTime: '10:00 – 11:00',
  // slot-request-admin specific
  event: 'New Slot Request Created',
  details: 'Test send — payment confirmed, awaiting mentor response.',
}

// Template-name → minimal templateData overrides we want to inject.
// Anything missing falls back to each template's own defaults / previewData.
const TEMPLATE_OVERRIDES: Record<string, Record<string, unknown>> = {
  'mentee-welcome': { menteeName: SAMPLE.menteeName },
  'mentor-welcome': { mentorName: SAMPLE.menteeName },
  'mentor-approved': { mentorName: SAMPLE.menteeName },
  'admin-mentor-signup': { name: SAMPLE.name, email: SAMPLE.email, phone: SAMPLE.phone },
  'admin-mentee-signup': { name: SAMPLE.name, email: SAMPLE.email, phone: SAMPLE.phone },
  'free-session-confirmed': {
    menteeName: SAMPLE.menteeName,
    mentorName: SAMPLE.mentorName,
    sessionDate: SAMPLE.sessionDate,
    sessionTime: SAMPLE.sessionTime,
    meetingLink: SAMPLE.meetingLink,
  },
  'slot-request-new': {
    mentorName: SAMPLE.mentorName,
    menteeName: SAMPLE.menteeName,
    requestedDate: SAMPLE.requestedDate,
    requestedTime: SAMPLE.requestedTime,
    message: SAMPLE.message,
  },
  'slot-request-accepted': {
    menteeName: SAMPLE.menteeName,
    mentorName: SAMPLE.mentorName,
    requestedDate: SAMPLE.requestedDate,
    requestedTime: SAMPLE.requestedTime,
    meetingLink: SAMPLE.meetingLink,
    meetingPasscode: SAMPLE.meetingPasscode,
    mentorMessage: SAMPLE.mentorMessage,
  },
  'slot-request-rejected': {
    menteeName: SAMPLE.menteeName,
    mentorName: SAMPLE.mentorName,
    requestedDate: SAMPLE.requestedDate,
    requestedTime: SAMPLE.requestedTime,
    refundInitiated: SAMPLE.refundInitiated,
    mentorMessage: 'Unavailable at this time — please try another slot.',
  },
  'slot-request-expired': {
    menteeName: SAMPLE.menteeName,
    mentorName: SAMPLE.mentorName,
    requestedDate: SAMPLE.requestedDate,
    requestedTime: SAMPLE.requestedTime,
  },
  'slot-request-mentee-confirmation': {
    menteeName: SAMPLE.menteeName,
    mentorName: SAMPLE.mentorName,
    requestedDate: SAMPLE.requestedDate,
    requestedTime: SAMPLE.requestedTime,
  },
  'slot-request-mentor-confirmed': {
    mentorName: SAMPLE.mentorName,
    menteeName: SAMPLE.menteeName,
    requestedDate: SAMPLE.requestedDate,
    requestedTime: SAMPLE.requestedTime,
    meetingLink: SAMPLE.meetingLink,
    meetingPasscode: SAMPLE.meetingPasscode,
  },
  'slot-request-admin': {
    event: SAMPLE.event,
    mentorName: SAMPLE.mentorName,
    menteeName: SAMPLE.menteeName,
    requestedDate: SAMPLE.requestedDate,
    requestedTime: SAMPLE.requestedTime,
    details: SAMPLE.details,
  },
  'chat-new-message': {
    receiverName: SAMPLE.receiverName,
    senderName: SAMPLE.senderName,
    preview: SAMPLE.preview,
  },
  'chat-reply-notification': {
    receiverName: SAMPLE.receiverName,
    senderName: SAMPLE.senderName,
    preview: SAMPLE.preview,
  },
  'chat-admin-notification': {
    senderName: SAMPLE.senderName,
    receiverName: SAMPLE.receiverName,
    preview: SAMPLE.preview,
  },
}

// Fallback list — must stay in sync with the registry. Used when the caller
// doesn't pass an explicit `templates` array.
const ALL_TEMPLATES = [
  'mentee-welcome',
  'mentor-welcome',
  'mentor-approved',
  'admin-mentor-signup',
  'admin-mentee-signup',
  'free-session-confirmed',
  'slot-request-new',
  'slot-request-accepted',
  'slot-request-rejected',
  'slot-request-expired',
  'slot-request-mentee-confirmation',
  'slot-request-mentor-confirmed',
  'slot-request-admin',
  'chat-new-message',
  'chat-reply-notification',
  'chat-admin-notification',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    let templates: string[] = ALL_TEMPLATES
    let recipientOverride: string | null = null

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (Array.isArray(body?.templates) && body.templates.length > 0) {
          templates = body.templates.filter((t: unknown) => typeof t === 'string')
        }
        if (typeof body?.recipient === 'string' && body.recipient.includes('@')) {
          recipientOverride = body.recipient
        }
      } catch {
        // empty body is fine — fall back to defaults
      }
    }

    const recipient = recipientOverride ?? TEST_RECIPIENT
    const runId = crypto.randomUUID()
    const results: Array<{ template: string; success: boolean; error?: string }> = []

    for (const templateName of templates) {
      const templateData = TEMPLATE_OVERRIDES[templateName] ?? {}
      const idempotencyKey = `test-${runId}-${templateName}`

      try {
        const { data, error } = await adminClient.functions.invoke('send-transactional-email', {
          body: {
            templateName,
            recipientEmail: recipient,
            idempotencyKey,
            templateData,
          },
        })

        if (error) {
          results.push({ template: templateName, success: false, error: error.message ?? String(error) })
          console.error(`[TestEmail] ${templateName} → invoke error:`, error)
          continue
        }

        if (data && typeof data === 'object' && 'error' in data && (data as any).error) {
          const msg = String((data as any).error)
          results.push({ template: templateName, success: false, error: msg })
          console.error(`[TestEmail] ${templateName} → function error:`, msg)
          continue
        }

        results.push({ template: templateName, success: true })
        console.log(`[TestEmail] ${templateName} → enqueued for ${recipient}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ template: templateName, success: false, error: msg })
        console.error(`[TestEmail] ${templateName} → exception:`, err)
      }
    }

    const summary = {
      runId,
      recipient,
      total: results.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      timestamp: new Date().toISOString(),
    }

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[TestEmail] fatal:', err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
