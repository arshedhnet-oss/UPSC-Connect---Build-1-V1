import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendStageEmail } from '../_shared/send-stage-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_WINDOW_MS = 3 * 60 * 1000 // 3 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const {
      conversationId,
      senderId,
      receiverId,
      messageText,
      senderName,
      senderRole,
      receiverName,
      receiverRole,
    } = await req.json()

    if (!conversationId || !senderId || !receiverId || !messageText) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tag = `[ChatEmail] conv=${conversationId} sender=${senderId}`
    const now = new Date()
    const timestamp = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const preview = messageText.slice(0, 150)

    // --- Batching: check if we recently notified this receiver about this conversation ---
    const { data: recentLog } = await adminClient
      .from('email_send_log')
      .select('created_at')
      .eq('template_name', senderRole === 'mentee' ? 'chat-new-message' : 'chat-reply-notification')
      .eq('recipient_email', '')  // placeholder — we check by metadata
      .gte('created_at', new Date(now.getTime() - BATCH_WINDOW_MS).toISOString())
      .limit(1)

    // More precise batching: check by metadata
    const { data: recentByMeta } = await adminClient
      .from('email_send_log')
      .select('created_at')
      .contains('metadata', { conversation_id: conversationId, receiver_id: receiverId })
      .in('template_name', ['chat-new-message', 'chat-reply-notification'])
      .gte('created_at', new Date(now.getTime() - BATCH_WINDOW_MS).toISOString())
      .limit(1)

    if (recentByMeta && recentByMeta.length > 0) {
      console.log(`${tag} — skipping: recent notification sent within batch window`)
      return new Response(JSON.stringify({ success: true, batched: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Check if receiver has unread messages (they might be active in chat) ---
    const { count: unreadCount } = await adminClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', receiverId)
      .eq('is_read', false)

    // If there are 0 unread (messages got read instantly), user is likely active — skip
    if (unreadCount === 0) {
      console.log(`${tag} — skipping: all messages already read (user likely active)`)
      return new Response(JSON.stringify({ success: true, skipped: 'active_user' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Get receiver email ---
    const { data: receiverProfile } = await adminClient
      .from('profiles')
      .select('email, name')
      .eq('id', receiverId)
      .single()

    if (!receiverProfile?.email) {
      console.error(`${tag} — receiver profile/email not found`)
      return new Response(JSON.stringify({ error: 'Receiver not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const context = { requestId: conversationId, stage: 'chat_message' }
    const idempotencyBase = `chat-${conversationId}-${senderId}-${now.getTime()}`

    // --- Send notification to receiver ---
    if (senderRole === 'mentee') {
      // Mentee sent a message → notify mentor
      await sendStageEmail(
        adminClient,
        'chat-new-message',
        receiverProfile.email,
        `${idempotencyBase}-mentor`,
        {
          senderName: senderName || 'A mentee',
          recipientName: receiverProfile.name || receiverName || 'Mentor',
          messagePreview: preview,
          timestamp,
          conversationId,
          senderRole: 'mentee',
        },
        { ...context, stage: 'chat_mentee_to_mentor' }
      )
    } else {
      // Mentor sent a message → notify mentee
      await sendStageEmail(
        adminClient,
        'chat-reply-notification',
        receiverProfile.email,
        `${idempotencyBase}-mentee`,
        {
          mentorName: senderName || 'Your Mentor',
          menteeName: receiverProfile.name || receiverName || 'Mentee',
          messagePreview: preview,
          timestamp,
          conversationId,
        },
        { ...context, stage: 'chat_mentor_to_mentee' }
      )
    }

    // --- Always notify admin ---
    await sendStageEmail(
      adminClient,
      'chat-admin-notification',
      'admin@upscconnect.in',
      `${idempotencyBase}-admin`,
      {
        senderName: senderName || 'User',
        senderRole: senderRole || 'user',
        recipientName: receiverName || receiverProfile.name || 'User',
        messagePreview: preview,
        timestamp,
        conversationId,
      },
      { ...context, stage: 'chat_admin_alert' }
    )

    // Log metadata for batching
    await adminClient.from('email_send_log').insert({
      message_id: crypto.randomUUID(),
      template_name: senderRole === 'mentee' ? 'chat-new-message' : 'chat-reply-notification',
      recipient_email: receiverProfile.email,
      status: 'batch_marker',
      metadata: { conversation_id: conversationId, receiver_id: receiverId },
    })

    console.log(`${tag} — chat email notifications sent successfully`)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[ChatEmail] exception:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
