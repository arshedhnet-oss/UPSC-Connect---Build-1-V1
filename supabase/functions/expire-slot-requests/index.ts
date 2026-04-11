import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendStageEmail } from "../_shared/send-stage-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "admin@upscconnect.in";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: expiredRequests, error: fetchErr } = await adminClient
      .from("booking_requests")
      .select("*")
      .eq("status", "pending_mentor_confirmation")
      .lt("expires_at", new Date().toISOString());

    if (fetchErr) {
      console.error("[Expiry] Error fetching expired requests:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredRequests || expiredRequests.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Expiry] Found ${expiredRequests.length} expired requests`);

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    const { data: admins } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
    const adminUserIds = admins?.map((a: any) => a.user_id) || [];

    let processed = 0;

    for (const request of expiredRequests) {
      const ctx = { requestId: request.id, stage: "expired" };
      try {
        // Step 1: Refund
        let refundSuccess = false;
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
              console.error(`[Expiry] Refund failed for ${request.id}:`, await refundRes.text());
            } else {
              console.log(`[Expiry] Refund initiated for ${request.id}`);
            }
          } catch (e) {
            console.error(`[Expiry] Refund error for ${request.id}:`, e);
          }
        } else {
          refundSuccess = true;
        }

        // Step 2: Update status
        await adminClient.from("booking_requests").update({
          status: "expired_refunded",
        }).eq("id", request.id);
        console.log(`[Expiry] Status updated to expired_refunded for ${request.id}`);

        // Step 3: Fetch profiles
        const { data: menteeProfile } = await adminClient
          .from("profiles").select("name, email").eq("id", request.mentee_id).single();
        const { data: mentorProfile } = await adminClient
          .from("profiles").select("name, email").eq("id", request.mentor_id).single();
        const requestedTime = `${request.requested_start_time.slice(0, 5)} – ${request.requested_end_time.slice(0, 5)}`;

        // Step 4: In-app notifications
        await adminClient.from("notifications").insert({
          user_id: request.mentee_id,
          type: "slot_request_expired",
          title: "Slot Request Expired",
          message: `Your session request for ${request.requested_date} expired. ${refundSuccess ? "A refund has been initiated." : "Please contact support."}`,
          metadata: { request_id: request.id, refund_initiated: refundSuccess },
        });

        if (adminUserIds.length > 0) {
          await adminClient.from("notifications").insert(
            adminUserIds.map((uid: string) => ({
              user_id: uid,
              type: "admin_slot_request_expired",
              title: "Slot Request Expired",
              message: `A slot request for ${request.requested_date} expired without mentor response. Refund ${refundSuccess ? "initiated" : "failed"}.`,
              metadata: { request_id: request.id },
            }))
          );
        }
        console.log(`[Expiry] In-app notifications created for ${request.id}`);

        // Step 5: Emails with full logging
        const emailResults: { recipient: string; success: boolean; error?: string }[] = [];

        if (menteeProfile?.email) {
          const r = await sendStageEmail(adminClient, "slot-request-expired", menteeProfile.email, `slot-expired-mentee-${request.id}`, {
            menteeName: menteeProfile.name,
            mentorName: mentorProfile?.name || "the mentor",
            requestedDate: request.requested_date,
            requestedTime,
          }, ctx);
          emailResults.push({ recipient: "mentee", ...r });
        }

        const adminR = await sendStageEmail(adminClient, "slot-request-admin", ADMIN_EMAIL, `slot-expired-admin-${request.id}`, {
          event: "Slot Request Expired",
          mentorName: mentorProfile?.name || "Unknown",
          menteeName: menteeProfile?.name || "Unknown",
          requestedDate: request.requested_date,
          requestedTime,
          details: `Mentor did not respond. Refund ${refundSuccess ? "initiated successfully" : "FAILED – manual action needed"}`,
        }, ctx);
        emailResults.push({ recipient: "admin", ...adminR });

        console.log(`[Expiry] Email results for ${request.id}:`, JSON.stringify(emailResults));

        processed++;
        console.log(`[Expiry] Processed request ${request.id}`);
      } catch (e) {
        console.error(`[Expiry] Failed to process request ${request.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ processed, total: expiredRequests.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Expiry] Function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
