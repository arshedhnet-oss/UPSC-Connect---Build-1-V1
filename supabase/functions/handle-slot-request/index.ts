import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

async function sendEmail(adminClient: any, templateName: string, recipientEmail: string, idempotencyKey: string, templateData: any) {
  try {
    await adminClient.functions.invoke("send-transactional-email", {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    });
  } catch (e) {
    console.error(`[Email] Failed to send ${templateName} to ${recipientEmail}:`, e);
  }
}

async function getAdminEmails(adminClient: any): Promise<{ user_id: string; email: string; name: string }[]> {
  const { data: admins } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
  if (!admins || admins.length === 0) return [];
  const results: { user_id: string; email: string; name: string }[] = [];
  for (const a of admins) {
    const { data: p } = await adminClient.from("profiles").select("email, name").eq("id", a.user_id).single();
    if (p?.email) results.push({ user_id: a.user_id, email: p.email, name: p.name });
  }
  return results;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id, action } = await req.json();

    if (!request_id || !["accept", "reject", "payment_confirmed"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "request_id and valid action required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: request, error: fetchErr } = await adminClient
      .from("booking_requests").select("*").eq("id", request_id).single();

    if (fetchErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile info
    const { data: menteeProfile } = await adminClient.from("profiles").select("name, email").eq("id", request.mentee_id).single();
    const { data: mentorProfile } = await adminClient.from("profiles").select("name, email").eq("id", request.mentor_id).single();
    const requestedTime = `${request.requested_start_time.slice(0, 5)} – ${request.requested_end_time.slice(0, 5)}`;
    const adminUsers = await getAdminEmails(adminClient);

    // ===== PAYMENT CONFIRMED =====
    if (action === "payment_confirmed") {
      if (request.mentee_id !== user.id) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

      await adminClient.from("booking_requests").update({
        status: "pending_mentor_confirmation",
        expires_at: expiresAt,
      }).eq("id", request_id);

      // In-app: notify mentor
      await adminClient.from("notifications").insert({
        user_id: request.mentor_id,
        type: "slot_request",
        title: "New Slot Request",
        message: `${menteeProfile?.name || "A mentee"} has requested a session on ${request.requested_date} at ${requestedTime}. Please accept or reject within 4 hours.`,
        metadata: { request_id, mentee_id: request.mentee_id },
      });

      // In-app: notify admins
      if (adminUsers.length > 0) {
        await adminClient.from("notifications").insert(
          adminUsers.map((a) => ({
            user_id: a.user_id,
            type: "admin_slot_request",
            title: "New Slot Request Created",
            message: `${menteeProfile?.name || "Mentee"} requested a session with ${mentorProfile?.name || "mentor"} on ${request.requested_date}.`,
            metadata: { request_id },
          }))
        );
      }

      // Email: mentor
      if (mentorProfile?.email) {
        await sendEmail(adminClient, "slot-request-new", mentorProfile.email, `slot-new-mentor-${request_id}`, {
          mentorName: mentorProfile.name,
          menteeName: menteeProfile?.name || "A mentee",
          requestedDate: request.requested_date,
          requestedTime,
          message: request.message,
        });
      }

      // Email: admins
      for (const admin of adminUsers) {
        await sendEmail(adminClient, "slot-request-admin", admin.email, `slot-new-admin-${request_id}-${admin.user_id}`, {
          event: "New Slot Request Created",
          mentorName: mentorProfile?.name || "Unknown",
          menteeName: menteeProfile?.name || "Unknown",
          requestedDate: request.requested_date,
          requestedTime,
          details: "Payment confirmed. Awaiting mentor response (4-hour timer started).",
        });
      }

      return new Response(
        JSON.stringify({ success: true, status: "pending_mentor_confirmation" }),
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

      await adminClient.from("booking_requests").update({
        status: "accepted",
        meeting_link: meetingLink,
        meeting_passcode: passcode,
      }).eq("id", request_id);

      // In-app: mentee
      await adminClient.from("notifications").insert({
        user_id: request.mentee_id,
        type: "slot_request_accepted",
        title: "Slot Request Accepted!",
        message: `${mentorProfile?.name || "Your mentor"} accepted your session for ${request.requested_date} at ${requestedTime}.`,
        metadata: { request_id, meeting_link: meetingLink },
      });

      // In-app: admins
      if (adminUsers.length > 0) {
        await adminClient.from("notifications").insert(
          adminUsers.map((a) => ({
            user_id: a.user_id,
            type: "admin_slot_request_accepted",
            title: "Slot Request Accepted",
            message: `${mentorProfile?.name || "Mentor"} accepted request from ${menteeProfile?.name || "mentee"} for ${request.requested_date}.`,
            metadata: { request_id },
          }))
        );
      }

      // Email: mentee
      if (menteeProfile?.email) {
        await sendEmail(adminClient, "slot-request-accepted", menteeProfile.email, `slot-accepted-mentee-${request_id}`, {
          menteeName: menteeProfile.name,
          mentorName: mentorProfile?.name || "your mentor",
          requestedDate: request.requested_date,
          requestedTime,
          meetingLink,
          meetingPasscode: passcode,
        });
      }

      // Email: admins
      for (const admin of adminUsers) {
        await sendEmail(adminClient, "slot-request-admin", admin.email, `slot-accepted-admin-${request_id}-${admin.user_id}`, {
          event: "Slot Request Accepted",
          mentorName: mentorProfile?.name || "Unknown",
          menteeName: menteeProfile?.name || "Unknown",
          requestedDate: request.requested_date,
          requestedTime,
          details: "Meeting link generated. Session confirmed.",
        });
      }

      return new Response(
        JSON.stringify({ success: true, status: "accepted", meeting_link: meetingLink, meeting_passcode: passcode }),
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
          if (!refundSuccess) console.error("Refund failed:", await refundRes.text());
        } catch (e) {
          console.error("Refund error:", e);
        }
      } else {
        refundSuccess = true; // Free session
      }

      await adminClient.from("booking_requests").update({ status: "rejected" }).eq("id", request_id);

      // In-app: mentee
      await adminClient.from("notifications").insert({
        user_id: request.mentee_id,
        type: "slot_request_rejected",
        title: "Slot Request Rejected",
        message: `Your session request for ${request.requested_date} was not accepted. ${refundSuccess ? "A refund has been initiated." : "Please contact support."}`,
        metadata: { request_id, refund_initiated: refundSuccess },
      });

      // In-app: admins
      if (adminUsers.length > 0) {
        await adminClient.from("notifications").insert(
          adminUsers.map((a) => ({
            user_id: a.user_id,
            type: "admin_slot_request_rejected",
            title: "Slot Request Rejected",
            message: `${mentorProfile?.name || "Mentor"} rejected request. Refund ${refundSuccess ? "initiated" : "failed"}.`,
            metadata: { request_id, refund_initiated: refundSuccess },
          }))
        );
      }

      // Email: mentee
      if (menteeProfile?.email) {
        await sendEmail(adminClient, "slot-request-rejected", menteeProfile.email, `slot-rejected-mentee-${request_id}`, {
          menteeName: menteeProfile.name,
          mentorName: mentorProfile?.name || "the mentor",
          requestedDate: request.requested_date,
          requestedTime,
          refundInitiated: refundSuccess,
        });
      }

      // Email: admins
      for (const admin of adminUsers) {
        await sendEmail(adminClient, "slot-request-admin", admin.email, `slot-rejected-admin-${request_id}-${admin.user_id}`, {
          event: "Slot Request Rejected",
          mentorName: mentorProfile?.name || "Unknown",
          menteeName: menteeProfile?.name || "Unknown",
          requestedDate: request.requested_date,
          requestedTime,
          details: `Mentor rejected. Refund ${refundSuccess ? "initiated" : "FAILED – manual action needed"}.`,
        });
      }

      return new Response(
        JSON.stringify({ success: true, status: "rejected", refund_initiated: refundSuccess }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
