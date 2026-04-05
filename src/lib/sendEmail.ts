import { supabase } from "@/integrations/supabase/client";

interface SendEmailOptions {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  accessToken?: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
  attempts: number;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a transactional email with automatic client-side retry (up to 2 retries).
 * Server-side queue also retries up to 5 times independently.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { templateName, recipientEmail, idempotencyKey, templateData, accessToken } = options;
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      console.log(`[Email] Attempt ${attempt}: sending "${templateName}" to ${recipientEmail}`);

      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        headers,
        body: {
          templateName,
          recipientEmail,
          idempotencyKey,
          templateData,
        },
      });

      if (error) {
        lastError = typeof error === "string" ? error : error.message || JSON.stringify(error);
        console.error(`[Email] Attempt ${attempt} failed for "${templateName}":`, lastError);
        if (attempt <= MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        break;
      }

      // Check for suppression (not a failure)
      if (data?.reason === "email_suppressed") {
        console.warn(`[Email] "${templateName}" suppressed for ${recipientEmail}`);
        return { success: true, attempts: attempt };
      }

      console.log(`[Email] "${templateName}" enqueued successfully on attempt ${attempt}`);
      return { success: true, attempts: attempt };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[Email] Attempt ${attempt} exception for "${templateName}":`, lastError);
      if (attempt <= MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
    }
  }

  console.error(`[Email] FAILED after ${MAX_RETRIES + 1} attempts: "${templateName}" → ${recipientEmail}. Last error: ${lastError}`);
  return { success: false, error: lastError, attempts: MAX_RETRIES + 1 };
}

/**
 * Send multiple emails in parallel with retry. Returns per-email results.
 */
export async function sendEmailBatch(
  emails: SendEmailOptions[]
): Promise<SendEmailResult[]> {
  return Promise.all(emails.map(sendEmail));
}
