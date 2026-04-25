// Thin wrapper that delegates rendering + queueing to the
// `send-transactional-email` Edge Function. This avoids importing React
// Email packages (which require per-function deno.json config) into every
// caller.

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
    const { data, error } = await adminClient.functions.invoke('send-transactional-email', {
      body: {
        templateName,
        recipientEmail,
        idempotencyKey,
        templateData,
      },
    })

    if (error) {
      console.error(`${tag} — invoke failed:`, error)
      return { success: false, error: error.message ?? String(error) }
    }

    if (data && typeof data === 'object' && 'error' in data && (data as any).error) {
      const msg = String((data as any).error)
      console.error(`${tag} — function returned error:`, msg)
      return { success: false, error: msg }
    }

    console.log(`${tag} — enqueued successfully`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`${tag} — exception:`, error)
    return { success: false, error: message }
  }
}
