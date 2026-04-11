import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TEMPLATES } from './transactional-email-templates/registry.ts'

const SITE_NAME = 'UPSC Connect'
const SENDER_DOMAIN = 'notify.www.upscconnect.in'
const FROM_DOMAIN = 'notify.www.upscconnect.in'

async function getOrCreateUnsubscribeToken(adminClient: any, email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()

  const { data: existingToken } = await adminClient
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .is('used_at', null)
    .maybeSingle()

  if (existingToken?.token) return existingToken.token

  const token = `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`

  const { error: upsertError } = await adminClient
    .from('email_unsubscribe_tokens')
    .upsert({ email: normalizedEmail, token }, { onConflict: 'email', ignoreDuplicates: true })

  if (upsertError) {
    throw upsertError
  }

  const { data: storedToken, error: reReadError } = await adminClient
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (reReadError || !storedToken?.token) {
    throw reReadError ?? new Error('Failed to confirm unsubscribe token storage')
  }

  return storedToken.token
}

export async function sendStageEmail(
  adminClient: any,
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
  context: { requestId: string; stage: string }
): Promise<{ success: boolean; error?: string }> {
  const tag = `[Email] request=${context.requestId} stage=${context.stage} template=${templateName} to=${recipientEmail}`

  try {
    const template = TEMPLATES[templateName]

    if (!template) {
      const error = `Template '${templateName}' not found`
      console.error(`${tag} — ${error}`)
      return { success: false, error }
    }

    const effectiveRecipient = template.to || recipientEmail

    if (!effectiveRecipient) {
      const error = 'Missing recipient email'
      console.error(`${tag} — ${error}`)
      return { success: false, error }
    }

    const { data: suppressed, error: suppressionError } = await adminClient
      .from('suppressed_emails')
      .select('id')
      .eq('email', effectiveRecipient.toLowerCase())
      .maybeSingle()

    if (suppressionError) {
      console.error(`${tag} — suppression check failed:`, suppressionError)
      return { success: false, error: suppressionError.message }
    }

    if (suppressed) {
      console.warn(`${tag} — recipient suppressed`)
      return { success: true }
    }

    const unsubscribeToken = await getOrCreateUnsubscribeToken(adminClient, effectiveRecipient)
    const html = await renderAsync(React.createElement(template.component, templateData))
    const text = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
    const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject
    const messageId = crypto.randomUUID()

    await adminClient.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'pending',
      metadata: { request_id: context.requestId, stage: context.stage },
    })

    const { error: enqueueError } = await adminClient.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: effectiveRecipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error(`${tag} — enqueue failed:`, enqueueError)
      await adminClient.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: enqueueError.message,
        metadata: { request_id: context.requestId, stage: context.stage },
      })
      return { success: false, error: enqueueError.message }
    }

    console.log(`${tag} — enqueued successfully`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`${tag} — exception:`, error)
    return { success: false, error: message }
  }
}