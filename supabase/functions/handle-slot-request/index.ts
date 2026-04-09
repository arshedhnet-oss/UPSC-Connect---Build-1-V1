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
        JSON.stringify({ error: "request_id and valid action (accept/reject/payment_confirmed) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the request
    const { data: request, error: fetchErr } = await adminClient
      .from("booking_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (fetchErr || !request) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle payment confirmed (called after Razorpay payment)
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

      // Create notification for mentor
      await adminClient.from("notifications").insert({
        user_id: request.mentor_id,
        type: "slot_request",
        title: "New Slot Request",
        message: `A mentee has requested a session on ${request.requested_date} at ${request.requested_start_time.slice(0, 5)}. Please accept or reject within 4 hours.`,
        metadata: { request_id, mentee_id: request.mentee_id },
      });

      // Notify admin
      const { data: admins } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        const adminNotifs = admins.map((a: any) => ({
          user_id: a.user_id,
          type: "admin_slot_request",
          title: "New Slot Request Created",
          message: `A new paid slot request has been created for ${request.requested_date}.`,
          metadata: { request_id },
        }));
        if (adminNotifs.length > 0) {
          await adminClient.from("notifications").insert(adminNotifs);
        }
      }

      return new Response(
        JSON.stringify({ success: true, status: "pending_mentor_confirmation" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify mentor is the one taking action
    if (request.mentor_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "pending_mentor_confirmation") {
      return new Response(
        JSON.stringify({ error: "Request is no longer pending" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This request has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "accept") {
      const meetingId = generateMeetingId();
      const passcode = generatePasscode();
      const meetingLink = `https://meet.jit.si/${meetingId}`;

      await adminClient.from("booking_requests").update({
        status: "accepted",
        meeting_link: meetingLink,
        meeting_passcode: passcode,
      }).eq("id", request_id);

      // Notify mentee
      await adminClient.from("notifications").insert({
        user_id: request.mentee_id,
        type: "slot_request_accepted",
        title: "Slot Request Accepted!",
        message: `Your session request for ${request.requested_date} has been accepted. Meeting link has been generated.`,
        metadata: { request_id, meeting_link: meetingLink },
      });

      // Notify admins
      const { data: admins } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        const adminNotifs = admins.map((a: any) => ({
          user_id: a.user_id,
          type: "admin_slot_request_accepted",
          title: "Slot Request Accepted",
          message: `A mentor has accepted a slot request for ${request.requested_date}.`,
          metadata: { request_id },
        }));
        if (adminNotifs.length > 0) {
          await adminClient.from("notifications").insert(adminNotifs);
        }
      }

      return new Response(
        JSON.stringify({ success: true, status: "accepted", meeting_link: meetingLink, meeting_passcode: passcode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reject") {
      // Initiate refund
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
          if (!refundRes.ok) {
            console.error("Refund failed:", await refundRes.text());
          }
        } catch (e) {
          console.error("Refund error:", e);
        }
      }

      await adminClient.from("booking_requests").update({
        status: "rejected",
      }).eq("id", request_id);

      // Notify mentee
      await adminClient.from("notifications").insert({
        user_id: request.mentee_id,
        type: "slot_request_rejected",
        title: "Slot Request Rejected",
        message: `Your session request for ${request.requested_date} was not accepted. ${refundSuccess ? "A refund has been initiated." : "Please contact support for refund."}`,
        metadata: { request_id, refund_initiated: refundSuccess },
      });

      // Notify admins
      const { data: admins } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        const adminNotifs = admins.map((a: any) => ({
          user_id: a.user_id,
          type: "admin_slot_request_rejected",
          title: "Slot Request Rejected",
          message: `A mentor rejected a slot request for ${request.requested_date}. Refund ${refundSuccess ? "initiated" : "failed - manual action needed"}.`,
          metadata: { request_id, refund_initiated: refundSuccess },
        }));
        if (adminNotifs.length > 0) {
          await adminClient.from("notifications").insert(adminNotifs);
        }
      }

      return new Response(
        JSON.stringify({ success: true, status: "rejected", refund_initiated: refundSuccess }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
