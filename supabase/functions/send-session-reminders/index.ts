import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify service_role caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Find slots starting in 55-65 minutes from now (1-hour window with 5min tolerance)
    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000);
    const to = new Date(now.getTime() + 65 * 60 * 1000);

    const fromDate = from.toISOString().split("T")[0];
    const toDate = to.toISOString().split("T")[0];
    const fromTime = from.toTimeString().slice(0, 8);
    const toTime = to.toTimeString().slice(0, 8);

    // Query slots within the reminder window
    // We need to handle the case where dates might span midnight
    const { data: slots, error: slotsErr } = await supabase
      .from("slots")
      .select("id, date, start_time, end_time, mentor_id, is_booked")
      .eq("is_booked", true)
      .gte("date", fromDate)
      .lte("date", toDate);

    if (slotsErr) {
      console.error("Failed to query slots:", slotsErr);
      return new Response(JSON.stringify({ error: "Failed to query slots" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!slots?.length) {
      return new Response(JSON.stringify({ processed: 0, message: "No upcoming sessions" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter slots whose start_time falls within the window
    const matchingSlots = slots.filter((slot) => {
      const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
      return slotDateTime >= from && slotDateTime <= to;
    });

    if (!matchingSlots.length) {
      return new Response(JSON.stringify({ processed: 0, message: "No sessions in reminder window" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slotIds = matchingSlots.map((s) => s.id);

    // Get confirmed bookings for these slots
    const { data: bookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("id, mentee_id, mentor_id, slot_id, meeting_link")
      .in("slot_id", slotIds)
      .eq("status", "confirmed");

    if (bookingsErr || !bookings?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let enqueued = 0;

    for (const booking of bookings) {
      const slot = matchingSlots.find((s) => s.id === booking.slot_id);
      if (!slot) continue;

      // Check idempotency - skip if reminder already sent
      const menteeMessageId = `reminder-mentee-${booking.id}`;
      const mentorMessageId = `reminder-mentor-${booking.id}`;

      const { data: alreadySent } = await supabase
        .from("email_send_log")
        .select("message_id")
        .in("message_id", [menteeMessageId, mentorMessageId])
        .in("status", ["sent", "pending"]);

      const sentIds = new Set((alreadySent || []).map((r) => r.message_id));

      // Get profiles
      const { data: menteeProfile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", booking.mentee_id)
        .single();

      const { data: mentorProfile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", booking.mentor_id)
        .single();

      if (!menteeProfile || !mentorProfile) continue;

      const sessionDate = new Date(slot.date).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const sessionTime = `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
      const meetingLink = booking.meeting_link || "";

      // Enqueue mentee reminder
      if (!sentIds.has(menteeMessageId)) {
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: menteeProfile.email,
            subject: "Reminder: Your Mentorship Session Starts in 1 Hour — UPSC Connect",
            html: buildMenteeReminderEmail(mentorProfile.name, sessionDate, sessionTime, meetingLink),
            message_id: menteeMessageId,
            label: "session-reminder-mentee",
            purpose: "transactional",
            sender_domain: "notify.www.upscconnect.in",
            queued_at: new Date().toISOString(),
          },
        });
        await supabase.from("email_send_log").insert({
          message_id: menteeMessageId,
          template_name: "session-reminder-mentee",
          recipient_email: menteeProfile.email,
          status: "pending",
        });
        enqueued++;
      }

      // Enqueue mentor reminder
      if (!sentIds.has(mentorMessageId)) {
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: mentorProfile.email,
            subject: "Reminder: Mentorship Session Starts in 1 Hour — UPSC Connect",
            html: buildMentorReminderEmail(menteeProfile.name, sessionDate, sessionTime, meetingLink),
            message_id: mentorMessageId,
            label: "session-reminder-mentor",
            purpose: "transactional",
            sender_domain: "notify.www.upscconnect.in",
            queued_at: new Date().toISOString(),
          },
        });
        await supabase.from("email_send_log").insert({
          message_id: mentorMessageId,
          template_name: "session-reminder-mentor",
          recipient_email: mentorProfile.email,
          status: "pending",
        });
        enqueued++;
      }
    }

    console.log(`Session reminders: ${enqueued} emails enqueued`);

    return new Response(
      JSON.stringify({ processed: enqueued }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-session-reminders error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process reminders" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ──────────── Email HTML Templates ────────────

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #f7f5f2; font-family: 'DM Sans', Arial, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
  .card { background: #ffffff; border-radius: 12px; padding: 32px; }
  .logo { font-size: 20px; font-weight: 700; color: hsl(220, 70%, 45%); margin-bottom: 24px; font-family: 'Space Grotesk', Arial, sans-serif; }
  h1 { font-size: 22px; color: hsl(220, 20%, 10%); margin: 0 0 16px; }
  p { font-size: 14px; color: hsl(220, 10%, 45%); line-height: 1.6; margin: 0 0 12px; }
  .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .detail-label { font-size: 13px; color: hsl(220, 10%, 45%); }
  .detail-value { font-size: 14px; color: hsl(220, 20%, 10%); font-weight: 500; }
  .btn { display: inline-block; padding: 12px 28px; background: hsl(220, 70%, 45%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 600; margin-top: 20px; }
  .alert-box { background: hsl(32, 90%, 95%); border-left: 4px solid hsl(32, 90%, 55%); padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
  .alert-box p { color: hsl(32, 60%, 30%); margin: 0; font-size: 13px; font-weight: 500; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: hsl(220, 10%, 45%); }
`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${baseStyles}</style></head><body><div class="container"><div class="card"><div class="logo">UPSC Connect</div>${content}</div><div class="footer"><p>Need help? Email us at <a href="mailto:support@upscconnect.in" style="color:hsl(220,70%,45%);">support@upscconnect.in</a></p><p>© ${new Date().getFullYear()} UPSC Connect. All rights reserved.</p></div></div></body></html>`;
}

function buildMenteeReminderEmail(mentorName: string, date: string, time: string, meetingLink: string): string {
  return emailWrapper(`
    <h1>Your Session Starts in 1 Hour ⏰</h1>
    <p>This is a friendly reminder that your mentorship session is coming up soon!</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentor</span><span class="detail-value">${mentorName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
    </div>
    <div class="alert-box"><p>💡 Please join 5 minutes early to ensure a smooth start.</p></div>
    ${meetingLink ? `<a href="${meetingLink}" class="btn">Join Session</a>` : ""}
  `);
}

function buildMentorReminderEmail(menteeName: string, date: string, time: string, meetingLink: string): string {
  return emailWrapper(`
    <h1>Session Reminder — 1 Hour to Go 📅</h1>
    <p>Your upcoming mentorship session is starting soon. Here are the details:</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentee</span><span class="detail-value">${menteeName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
    </div>
    <div class="alert-box"><p>Please be available at the scheduled time.</p></div>
    ${meetingLink ? `<a href="${meetingLink}" class="btn">Join Session</a>` : ""}
  `);
}
