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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000);
    const to = new Date(now.getTime() + 65 * 60 * 1000);

    const fromDate = from.toISOString().split("T")[0];
    const toDate = to.toISOString().split("T")[0];

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

    const { data: bookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("id, mentee_id, mentor_id, slot_id, meeting_link, meeting_passcode")
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

      const menteeMessageId = `reminder-mentee-${booking.id}`;
      const mentorMessageId = `reminder-mentor-${booking.id}`;

      const { data: alreadySent } = await supabase
        .from("email_send_log")
        .select("message_id")
        .in("message_id", [menteeMessageId, mentorMessageId])
        .in("status", ["sent", "pending"]);

      const sentIds = new Set((alreadySent || []).map((r) => r.message_id));

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
      const sessionTime = `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`;
      const meetingLink = booking.meeting_link || "";
      const passcode = booking.meeting_passcode || "";

      // Generate unsubscribe tokens
      const menteeUnsubToken = await getOrCreateUnsubscribeToken(supabase, menteeProfile.email);
      const mentorUnsubToken = await getOrCreateUnsubscribeToken(supabase, mentorProfile.email);

      // Enqueue mentee reminder
      if (!sentIds.has(menteeMessageId)) {
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: menteeProfile.email,
            from: "UPSC Connect <noreply@notify.www.upscconnect.in>",
            subject: "Reminder: Your Mentorship Session Starts in 1 Hour — UPSC Connect",
            html: buildMenteeReminderEmail(mentorProfile.name, sessionDate, sessionTime, meetingLink, passcode),
            text: `Reminder: Your session starts in 1 hour!\n\nMentor: ${mentorProfile.name}\nDate: ${sessionDate}\nTime: ${sessionTime}\nMeeting Link: ${meetingLink}\nPasscode: ${passcode}\n\nPlease join 5 minutes early.`,
            message_id: menteeMessageId,
            idempotency_key: menteeMessageId,
            label: "session-reminder-mentee",
            purpose: "transactional",
            sender_domain: "notify.www.upscconnect.in",
            unsubscribe_token: menteeUnsubToken,
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
            from: "UPSC Connect <noreply@notify.www.upscconnect.in>",
            subject: "Reminder: Mentorship Session Starts in 1 Hour — UPSC Connect",
            html: buildMentorReminderEmail(menteeProfile.name, sessionDate, sessionTime, meetingLink, passcode),
            text: `Reminder: Session starts in 1 hour!\n\nMentee: ${menteeProfile.name}\nDate: ${sessionDate}\nTime: ${sessionTime}\nMeeting Link: ${meetingLink}\nPasscode: ${passcode}\n\nPlease be available at the scheduled time.`,
            message_id: mentorMessageId,
            idempotency_key: mentorMessageId,
            label: "session-reminder-mentor",
            purpose: "transactional",
            sender_domain: "notify.www.upscconnect.in",
            unsubscribe_token: mentorUnsubToken,
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
      // Send push notifications for this booking
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_ids: [booking.mentee_id, booking.mentor_id],
            title: "Session Starting Soon! ⏰",
            body: `Your mentorship session starts in 1 hour at ${sessionTime}. Get ready!`,
            url: "/dashboard#bookings",
            tag: `reminder-${booking.id}`,
          }),
        });
      } catch {}
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
  .logo { font-size: 20px; font-weight: 700; color: #2556b9; margin-bottom: 24px; }
  h1 { font-size: 22px; color: #1a1f2e; margin: 0 0 16px; }
  p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 12px; }
  .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .detail-label { font-size: 13px; color: #94a3b8; }
  .detail-value { font-size: 14px; color: #1a1f2e; font-weight: 500; }
  .btn { display: inline-block; padding: 12px 28px; background: #2556b9; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 20px; }
  .passcode-box { background: #f8fafc; border: 2px dashed #2556b9; border-radius: 10px; padding: 16px; text-align: center; margin: 16px 0; }
  .passcode-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; }
  .passcode-value { font-size: 24px; font-weight: 700; color: #2556b9; font-family: 'Courier New', monospace; letter-spacing: 3px; margin: 0; }
  .alert-box { background: hsl(32, 90%, 95%); border-left: 4px solid hsl(32, 90%, 55%); padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
  .alert-box p { color: hsl(32, 60%, 30%); margin: 0; font-size: 13px; font-weight: 500; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${baseStyles}</style></head><body><div class="container"><div class="card"><div class="logo">UPSC Connect</div>${content}</div><div class="footer"><p>Need help? Email us at <a href="mailto:admin@upscconnect.in" style="color:#2556b9;">admin@upscconnect.in</a></p><p>© ${new Date().getFullYear()} UPSC Connect. All rights reserved.</p></div></div></body></html>`;
}

function buildMenteeReminderEmail(mentorName: string, date: string, time: string, meetingLink: string, passcode: string): string {
  return emailWrapper(`
    <h1>Your Session Starts in 1 Hour ⏰</h1>
    <p>This is a friendly reminder that your mentorship session is coming up soon!</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentor</span><span class="detail-value">${mentorName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
    </div>
    ${passcode ? `<div class="passcode-box"><p class="passcode-label">Meeting Passcode</p><p class="passcode-value">${passcode}</p></div>` : ""}
    <div class="alert-box"><p>💡 Please join 5 minutes early to ensure a smooth start.</p></div>
    ${meetingLink ? `<a href="${meetingLink}" class="btn">Join Meeting</a>` : ""}
  `);
}

function buildMentorReminderEmail(menteeName: string, date: string, time: string, meetingLink: string, passcode: string): string {
  return emailWrapper(`
    <h1>Session Reminder — 1 Hour to Go 📅</h1>
    <p>Your upcoming mentorship session is starting soon. Here are the details:</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentee</span><span class="detail-value">${menteeName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
    </div>
    ${passcode ? `<div class="passcode-box"><p class="passcode-label">Meeting Passcode</p><p class="passcode-value">${passcode}</p></div>` : ""}
    <div class="alert-box"><p>Please be available at the scheduled time.</p></div>
    ${meetingLink ? `<a href="${meetingLink}" class="btn">Join Meeting</a>` : ""}
  `);
}
