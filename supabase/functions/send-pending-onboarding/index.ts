import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Find all users who never received onboarding emails
  // by checking email_send_log for missing entries

  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role, created_at')

  if (profilesError) {
    console.error('Failed to fetch profiles', profilesError)
    return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get all existing onboarding email logs
  const { data: existingLogs } = await supabase
    .from('email_send_log')
    .select('template_name, recipient_email, status')
    .in('template_name', ['mentee-welcome', 'mentor-welcome', 'admin-mentee-signup', 'admin-mentor-signup'])

  const sentSet = new Set<string>()
  for (const log of existingLogs || []) {
    // Consider it sent if there's any entry (pending/sent)
    sentSet.add(`${log.template_name}:${log.recipient_email.toLowerCase()}`)
  }

  const results: Array<{ user: string; template: string; status: string }> = []

  for (const profile of profiles || []) {
    if (!profile.email) continue

    const email = profile.email.toLowerCase()

    if (profile.role === 'mentee') {
      // Send mentee-welcome if not already sent
      if (!sentSet.has(`mentee-welcome:${email}`)) {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'mentee-welcome',
            recipientEmail: profile.email,
            idempotencyKey: `mentee-welcome-${profile.id}`,
            templateData: { menteeName: profile.name || 'there' },
          },
        })
        results.push({ user: profile.email, template: 'mentee-welcome', status: error ? `error: ${error.message}` : 'sent' })
      }

      // Send admin-mentee-signup if not already sent
      if (!sentSet.has(`admin-mentee-signup:admin@upscconnect.in`)) {
        // Check per-user idempotency via a more specific check
        const adminKey = `admin-mentee-signup:${profile.id}`
        const alreadySentAdmin = (existingLogs || []).some(
          l => l.template_name === 'admin-mentee-signup' && l.recipient_email === 'admin@upscconnect.in'
            // We can't easily check per-user from logs, so use idempotency key
        )
      }
      // Send admin notification with user-specific idempotency
      const adminIdempKey = `admin-mentee-signup-${profile.id}`
      const hasAdminLog = (existingLogs || []).some(
        l => l.template_name === 'admin-mentee-signup'
      )
      // Just send it - idempotency key will prevent duplicates server-side
      if (!sentSet.has(`admin-mentee-signup:admin@upscconnect.in`) || true) {
        // Use message_id check instead
        const { data: existingMsg } = await supabase
          .from('email_send_log')
          .select('id')
          .eq('template_name', 'admin-mentee-signup')
          .eq('message_id', adminIdempKey)
          .maybeSingle()

        if (!existingMsg) {
          const { error } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'admin-mentee-signup',
              recipientEmail: 'admin@upscconnect.in',
              idempotencyKey: adminIdempKey,
              templateData: {
                menteeName: profile.name || 'New User',
                menteeEmail: profile.email,
                menteePhone: profile.phone || '',
                signupTime: new Date(profile.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
              },
            },
          })
          results.push({ user: profile.email, template: 'admin-mentee-signup', status: error ? `error: ${error.message}` : 'sent' })
        }
      }
    }

    if (profile.role === 'mentor') {
      // Check if mentor-welcome was already sent to this user
      if (!sentSet.has(`mentor-welcome:${email}`)) {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'mentor-welcome',
            recipientEmail: profile.email,
            idempotencyKey: `mentor-welcome-${profile.id}`,
            templateData: { mentorName: profile.name || 'Mentor' },
          },
        })
        results.push({ user: profile.email, template: 'mentor-welcome', status: error ? `error: ${error.message}` : 'sent' })
      }

      // Admin mentor signup notification
      const adminIdempKey = `admin-mentor-signup-${profile.id}`
      const { data: existingMsg } = await supabase
        .from('email_send_log')
        .select('id')
        .eq('template_name', 'admin-mentor-signup')
        .eq('message_id', adminIdempKey)
        .maybeSingle()

      if (!existingMsg) {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'admin-mentor-signup',
            recipientEmail: 'admin@upscconnect.in',
            idempotencyKey: adminIdempKey,
            templateData: {
              mentorName: profile.name || 'New Mentor',
              mentorEmail: profile.email,
              mentorPhone: profile.phone || '',
            },
          },
        })
        results.push({ user: profile.email, template: 'admin-mentor-signup', status: error ? `error: ${error.message}` : 'sent' })
      }
    }
  }

  console.log('Pending onboarding emails processed:', JSON.stringify(results))

  return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
