import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = 'UPSC Connect'
const SENDER_DOMAIN = 'notify.www.upscconnect.in'
const FROM_DOMAIN = 'notify.www.upscconnect.in'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function enqueueOnboardingEmail(
  supabase: any,
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData: Record<string, any>,
) {
  const template = TEMPLATES[templateName]
  if (!template) return { status: 'template_not_found' }

  // Check if already sent via idempotency
  const messageId = idempotencyKey

  // Check suppression
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', recipientEmail.toLowerCase())
    .maybeSingle()
  if (suppressed) return { status: 'suppressed' }

  // Get/create unsubscribe token
  const normalizedEmail = recipientEmail.toLowerCase()
  let unsubscribeToken: string

  const { data: existingToken } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    unsubscribeToken = generateToken()
    await supabase.from('email_unsubscribe_tokens').upsert(
      { token: unsubscribeToken, email: normalizedEmail },
      { onConflict: 'email', ignoreDuplicates: true }
    )
    const { data: stored } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (stored) unsubscribeToken = stored.token
  } else {
    return { status: 'already_unsubscribed' }
  }

  // Render template
  const html = await renderAsync(React.createElement(template.component, templateData))
  const plainText = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
  const resolvedSubject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  // Log pending
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipientEmail,
    status: 'pending',
  })

  // Enqueue
  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  return { status: error ? `error: ${error.message}` : 'enqueued' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role, created_at')

  // Get existing onboarding email message_ids to avoid duplicates
  const { data: existingLogs } = await supabase
    .from('email_send_log')
    .select('message_id')
    .in('template_name', ['mentee-welcome', 'mentor-welcome', 'admin-mentee-signup', 'admin-mentor-signup'])

  const sentIds = new Set((existingLogs || []).map(l => l.message_id).filter(Boolean))

  const results: Array<{ user: string; template: string; status: string }> = []

  for (const p of profiles || []) {
    if (!p.email) continue

    if (p.role === 'mentee') {
      const welcomeKey = `mentee-welcome-${p.id}`
      const adminKey = `admin-mentee-signup-${p.id}`

      if (!sentIds.has(welcomeKey)) {
        const r = await enqueueOnboardingEmail(supabase, 'mentee-welcome', p.email, welcomeKey, { menteeName: p.name || 'there' })
        results.push({ user: p.email, template: 'mentee-welcome', status: r.status })
      }

      if (!sentIds.has(adminKey)) {
        const r = await enqueueOnboardingEmail(supabase, 'admin-mentee-signup', 'admin@upscconnect.in', adminKey, {
          menteeName: p.name || 'New User',
          menteeEmail: p.email,
          menteePhone: p.phone || '',
          signupTime: new Date(p.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        })
        results.push({ user: p.email, template: 'admin-mentee-signup', status: r.status })
      }
    }

    if (p.role === 'mentor') {
      const welcomeKey = `mentor-welcome-${p.id}`
      const adminKey = `admin-mentor-signup-${p.id}`

      if (!sentIds.has(welcomeKey)) {
        const r = await enqueueOnboardingEmail(supabase, 'mentor-welcome', p.email, welcomeKey, { mentorName: p.name || 'Mentor' })
        results.push({ user: p.email, template: 'mentor-welcome', status: r.status })
      }

      if (!sentIds.has(adminKey)) {
        const r = await enqueueOnboardingEmail(supabase, 'admin-mentor-signup', 'admin@upscconnect.in', adminKey, {
          mentorName: p.name || 'New Mentor',
          mentorEmail: p.email,
          mentorPhone: p.phone || '',
        })
        results.push({ user: p.email, template: 'admin-mentor-signup', status: r.status })
      }
    }
  }

  console.log(`Pending onboarding: ${results.length} emails enqueued`)

  return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
