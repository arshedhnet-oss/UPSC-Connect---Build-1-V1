import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "admin@upscconnect.in";

function generateMeetingId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const segments = [8, 4, 4].map((len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
  return segments.join("-");
}

function generatePasscode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Robust email sender — logs every attempt and result, never silently swallows errors
async function sendStageEmail(
  adminClient: any,
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData: any,
  context: { requestId: string; stage: string }
): Promise<{ success: boolean; error?: string }> {
  const tag = `[Email] request=${context.requestId} stage=${context.stage} template=${templateName} to=${recipientEmail}`;
  try {
    console.log(`${tag} — sending`);
    const { data, error } = await adminClient.functions.invoke("send-transactional-email", {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    });
    if (error) {
      console.error(`${tag} — invoke error:`, error);
      return { success: false, error: String(error) };
    }
    // Check for application-level error in response
    if (data && typeof data === "object" && data.error) {
      console.error(`${tag} — app error:`, data.error);
      return { success: false, error: String(data.error) };
    }
    console.log(`${tag} — enqueued successfully`);
    return { success: true };
  } catch (e) {
    console.error(`${tag} — exception:`, e);
    return { success: false, error: String(e) };
  }
}

async function getAdminUserIds(adminClient: any): Promise<string[]> {
  const { data: admins } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
  return admins?.map((a: any) => a.user_id) || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a service-role call (from webhook fallback)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    let user: { id: string } | null = null;

    if (isServiceRole) {
      // Service-role calls are trusted (from webhook) — user identity comes from the request body
      console.log("[SlotRequest] Service-role call detected (webhook fallback)");
    } else {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = authUser;
    }

    const { request_id, action, mentor_message } = await req.json();

    if (!request_id || !["accept", "reject", "payment_confirmed"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "request_id and valid action required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedMessage = typeof mentor_message === "string" ? mentor_message.trim().slice(0, 300) : null;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: request, error: fetchErr } = await adminClient
      .from("booking_requests").select("*").eq("id", request_id).single();

    if (fetchErr || !request) {
      console.error(`[SlotRequest] Request not found: ${request_id}`, fetchErr);
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: menteeProfile } = await adminClient.from("profiles").select("name, email, phone").eq("id", request.mentee_id).single();
    const { data: mentorProfile } = await adminClient.from("profiles").select("name, email").eq("id", request.mentor_id).single();
    const requestedTime = `${request.requested_start_time.slice(0, 5)} – ${request.requested_end_time.slice(0, 5)}`;
    const adminUserIds = await getAdminUserIds(adminClient);
    const ctx = { requestId: request_id, stage: action };

    console.log(`[SlotRequest] Processing action=${action} request=${request_id} mentor=${request.mentor_id} mentee=${request.mentee_id}`);

    // ===== PAYMENT CONFIRMED =====
    if (action === "payment_confirmed") {
      // Allow service-role calls (webhook fallback) or the mentee themselves
      if (!isServiceRole && (!user || request.mentee_id !== user.id)) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency: if already past pending_payment, skip
      if (request.status === "pending_mentor_confirmation") {
        console.log(`[SlotRequest] Already confirmed payment for ${request_id}, skipping`);
        return new Response(
          JSON.stringify({ success: true, status: "pending_mentor_confirmation" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

      // Step 1: Update status
      const { error: updateErr } = await adminClient.from("booking_requests").update({
        status: "pending_mentor_confirmation",
        expires_at: expiresAt,
      }).eq("id", request_id);

      if (updateErr) {
        console.error(`[SlotRequest] Failed to update status for ${request_id}:`, updateErr);
        return new Response(JSON.stringify({ error: "Failed to update request status" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`[SlotRequest] Status updated to pending_mentor_confirmation for ${request_id}`);

      // Step 2: In-app notifications
      await adminClient.from("notifications").insert({
        user_id: request.mentor_id,
        type: "slot_request",
        title: "New Slot Request",
        message: `${menteeProfile?.name || "A mentee"} has requested a session on ${request.requested_date} at ${requestedTime}. Please accept or reject within 4 hours.`,
        metadata: { request_id, mentee_id: request.mentee_id },
      });

      if (adminUserIds.length > 0) {
        await adminClient.from("notifications").insert(
          adminUserIds.map((uid: string) => ({
            user_id: uid,
            type: "admin_slot_request",
            title: "New Slot Request Created",
            message: `${menteeProfile?.name || "Mentee"} requested a session with ${mentorProfile?.name || "mentor"} on ${request.requested_date}.`,
            metadata: { request_id },
          }))
        );
      }
      console.log(`[SlotRequest] In-app notifications created for ${request_id}`);

      // Step 3: Emails — send all, log results
      const emailResults: { recipient: string; template: string; success: boolean; error?: string }[] = [];

      if (mentorProfile?.email) {
        const r = await sendStageEmail(adminClient, "slot-request-new", mentorProfile.email, `slot-new-mentor-${request_id}`, {
          mentorName: mentorProfile.name,
          menteeName: menteeProfile?.name || "A mentee",
          requestedDate: request.requested_date,
          requestedTime,
          message: request.message,
        }, ctx);
        emailResults.push({ recipient: "mentor", template: "slot-request-new", ...r });
      }

      if (menteeProfile?.email) {
        const r = await sendStageEmail(adminClient, "slot-request-mentee-confirmation", menteeProfile.email, `slot-confirm-mentee-${request_id}`, {
          menteeName: menteeProfile.name,
          mentorName: mentorProfile?.name || "the mentor",
          requestedDate: request.requested_date,
          requestedTime,
        }, ctx);
        emailResults.push({ recipient: "mentee", template: "slot-request-mentee-confirmation", ...r });
      }

      const adminR = await sendStageEmail(adminClient, "slot-request-admin", ADMIN_EMAIL, `slot-new-admin-${request_id}`, {
        event: "New Slot Request Created",
        mentorName: mentorProfile?.name || "Unknown",
        menteeName: menteeProfile?.name || "Unknown",
        requestedDate: request.requested_date,
        requestedTime,
        details: `Payment confirmed. Awaiting mentor response (4-hour timer started). Mentee contact: ${menteeProfile?.email || "N/A"}, ${menteeProfile?.phone || "N/A"}`,
      }, ctx);
      emailResults.push({ recipient: "admin", template: "slot-request-admin", ...adminR });

      console.log(`[SlotRequest] Email results for ${request_id}:`, JSON.stringify(emailResults));

      return new Response(
        JSON.stringify({ success: true, status: "pending_mentor_confirmation", email_results: emailResults }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify mentor authorization
    if (request.mentor_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "pending_mentor_confirmation") {
      return new Response(JSON.stringify({ error: "Request is no longer pending" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This request has expired" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACCEPT =====
    if (action === "accept") {
      const meetingId = generateMeetingId();
      const passcode = generatePasscode();
      const meetingLink = `https://meet.jit.si/${meetingId}`;

      // Step 1: Update status
      await adminClient.from("booking_requests").update({
        status: "accepted",
        meeting_link: meetingLink,
        meeting_passcode: passcode,
        mentor_message: sanitizedMessage,
      }).eq("id", request_id);
      console.log(`[SlotRequest] Request ${request_id} accepted`);

      // Step 2: In-app notifications
      const menteeNotifMsg = sanitizedMessage
        ? `${mentorProfile?.name || "Your mentor"} accepted your session for ${request.requested_date} at ${requestedTime}. Message: "${sanitizedMessage}"`
        : `${mentorProfile?.name || "Your mentor"} accepted your session for ${request.requested_date} at ${requestedTime}.`;

      await adminClient.from("notifications").insert({
        user_id: request.mentee_id,
        type: "slot_request_accepted",
        title: "Slot Request Accepted!",
        message: menteeNotifMsg,
        metadata: { request_id, meeting_link: meetingLink, mentor_message: sanitizedMessage },
      });

      if (adminUserIds.length > 0) {
        await adminClient.from("notifications").insert(
          adminUserIds.map((uid: string) => ({
            user_id: uid,
            type: "admin_slot_request_accepted",
            title: "Slot Request Accepted",
            message: `${mentorProfile?.name || "Mentor"} accepted request from ${menteeProfile?.name || "mentee"} for ${request.requested_date}.${sanitizedMessage ? ` Mentor message: "${sanitizedMessage}"` : ""}`,
            metadata: { request_id, mentor_message: sanitizedMessage },
          }))
        );
      }
      console.log(`[SlotRequest] Accept in-app notifications created for ${request_id}`);

      // Step 3: Emails
      const emailResults: { recipient: string; template: string; success: boolean; error?: string }[] = [];

      if (menteeProfile?.email) {
        const r = await sendStageEmail(adminClient, "slot-request-accepted", menteeProfile.email, `slot-accepted-mentee-${request_id}`, {
          menteeName: menteeProfile.name,
          mentorName: mentorProfile?.name || "your mentor",
          requestedDate: request.requested_date,
          requestedTime,
          meetingLink,
          meetingPasscode: passcode,
          mentorMessage: sanitizedMessage,
        }, ctx);
        emailResults.push({ recipient: "mentee", template: "slot-request-accepted", ...r });
      }

      if (mentorProfile?.email) {
        const r = await sendStageEmail(adminClient, "slot-request-mentor-confirmed", mentorProfile.email, `slot-accepted-mentor-${request_id}`, {
          mentorName: mentorProfile.name,
          menteeName: menteeProfile?.name || "the mentee",
          requestedDate: request.requested_date,
          requestedTime,
          meetingLink,
          meetingPasscode: passcode,
        }, ctx);
        emailResults.push({ recipient: "mentor", template: "slot-request-mentor-confirmed", ...r });
      }

      const adminR = await sendStageEmail(adminClient, "slot-request-admin", ADMIN_EMAIL, `slot-accepted-admin-${request_id}`, {
        event: "Slot Request Accepted",
        mentorName: mentorProfile?.name || "Unknown",
        menteeName: menteeProfile?.name || "Unknown",
        requestedDate: request.requested_date,
        requestedTime,
        details: `Meeting link generated: ${meetingLink}. Session confirmed.${sanitizedMessage ? ` Mentor message: "${sanitizedMessage}"` : ""}`,
      }, ctx);
      emailResults.push({ recipient: "admin", template: "slot-request-admin", ...adminR });

      console.log(`[SlotRequest] Accept email results for ${request_id}:`, JSON.stringify(emailResults));

      return new Response(
        JSON.stringify({ success: true, status: "accepted", meeting_link: meetingLink, meeting_passcode: passcode, email_results: emailResults }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== REJECT =====
    if (action === "reject") {
      let refundSuccess = false;
      const keyId = Deno.env.get("RAZORPAY_KEY_ID");
      const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

      if (request.payment_id && keyId && keySecret) {
        try {
          const refundRes = await fetch(
            `https://api.razorpay.com/v1/payments/${request.payment_id}/refund`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
              },
              body: JSON.stringify({ speed: "normal" }),
            }
          );
          refundSuccess = refundRes.ok;
          if (!refundSuccess) {
            const errText = await refundRes.text();
            console.error(`[SlotRequest] Refund failed for ${request_id}:`, errText);
          } else {
            console.log(`[SlotRequest] Refund initiated for ${request_id}`);
          }
        } catch (e) {
          console.error(`[SlotRequest] Refund error for ${request_id}:`, e);
        }
      } else {
        refundSuccess = true; // No payment to refund
      }

      // Step 1: Update status
      await adminClient.from("booking_requests").update({
        status: "rejected",
        mentor_message: sanitizedMessage,
      }).eq("id", request_id);
      console.log(`[SlotRequest] Request ${request_id} rejected`);

      // Step 2: In-app notifications
      const menteeRejectMsg = sanitizedMessage
        ? `Your session request for ${request.requested_date} was not accepted. ${refundSuccess ? "A refund has been initiated." : "Please contact support."} Mentor's message: "${sanitizedMessage}"`
        : `Your session request for ${request.requested_date} was not accepted. ${refundSuccess ? "A refund has been initiated." : "Please contact support."}`;

      await adminClient.from("notifications").insert({
        user_id: request.mentee_id,
        type: "slot_request_rejected",
        title: "Slot Request Rejected",
        message: menteeRejectMsg,
        metadata: { request_id, refund_initiated: refundSuccess, mentor_message: sanitizedMessage },
      });

      if (adminUserIds.length > 0) {
        await adminClient.from("notifications").insert(
          adminUserIds.map((uid: string) => ({
            user_id: uid,
            type: "admin_slot_request_rejected",
            title: "Slot Request Rejected",
            message: `${mentorProfile?.name || "Mentor"} rejected request. Refund ${refundSuccess ? "initiated" : "failed"}.${sanitizedMessage ? ` Mentor message: "${sanitizedMessage}"` : ""}`,
            metadata: { request_id, refund_initiated: refundSuccess, mentor_message: sanitizedMessage },
          }))
        );
      }
      console.log(`[SlotRequest] Reject in-app notifications created for ${request_id}`);

      // Step 3: Emails
      const emailResults: { recipient: string; template: string; success: boolean; error?: string }[] = [];

      if (menteeProfile?.email) {
        const r = await sendStageEmail(adminClient, "slot-request-rejected", menteeProfile.email, `slot-rejected-mentee-${request_id}`, {
          menteeName: menteeProfile.name,
          mentorName: mentorProfile?.name || "the mentor",
          requestedDate: request.requested_date,
          requestedTime,
          refundInitiated: refundSuccess,
          mentorMessage: sanitizedMessage,
        }, ctx);
        emailResults.push({ recipient: "mentee", template: "slot-request-rejected", ...r });
      }

      const adminR = await sendStageEmail(adminClient, "slot-request-admin", ADMIN_EMAIL, `slot-rejected-admin-${request_id}`, {
        event: "Slot Request Rejected",
        mentorName: mentorProfile?.name || "Unknown",
        menteeName: menteeProfile?.name || "Unknown",
        requestedDate: request.requested_date,
        requestedTime,
        details: `Mentor rejected. Refund ${refundSuccess ? "initiated" : "FAILED – manual action needed"}.${sanitizedMessage ? ` Mentor message: "${sanitizedMessage}"` : ""}`,
      }, ctx);
      emailResults.push({ recipient: "admin", template: "slot-request-admin", ...adminR });

      console.log(`[SlotRequest] Reject email results for ${request_id}:`, JSON.stringify(emailResults));

      return new Response(
        JSON.stringify({ success: true, status: "rejected", refund_initiated: refundSuccess, email_results: emailResults }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SlotRequest] Function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
