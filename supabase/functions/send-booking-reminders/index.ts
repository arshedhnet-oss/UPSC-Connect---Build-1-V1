import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_REMINDERS = 3;
const REMINDER_INTERVALS_HOURS = [6, 18, 36]; // 6h, 18h, 36h after booking

async function getOrCreateUnsubscribeToken(supabase: any, email: string): Promise<string> {
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .is("used_at", null)
    .maybeSingle();
  if (existing?.token) return existing.token;
  const token = crypto.randomUUID();
  await supabase.from("email_unsubscribe_tokens").insert({ email, token });
  return token;
}

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

    // Find all pending_payment bookings older than 6 hours
    const cutoff = new Date(now.getTime() - REMINDER_INTERVALS_HOURS[0] * 60 * 60 * 1000);

    const { data: pendingBookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("id, mentee_id, mentor_id, slot_id, created_at")
      .eq("status", "pending_payment")
      .lte("created_at", cutoff.toISOString());

    if (bookingsErr) {
      console.error("Failed to query pending bookings:", bookingsErr);
      return new Response(JSON.stringify({ error: "Failed to query bookings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingBookings?.length) {
      return new Response(JSON.stringify({ processed: 0, message: "No pending bookings to remind" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let enqueued = 0;

    for (const booking of pendingBookings) {
      const bookingAge = (now.getTime() - new Date(booking.created_at).getTime()) / (60 * 60 * 1000);

      // Check how many reminders already sent for this booking
      const reminderIds = Array.from({ length: MAX_REMINDERS }, (_, i) =>
        `booking-reminder-${booking.id}-${i + 1}`
      );

      const { data: sentReminders } = await supabase
        .from("email_send_log")
        .select("message_id")
        .in("message_id", reminderIds)
        .in("status", ["sent", "pending"]);

      const sentCount = sentReminders?.length || 0;
      if (sentCount >= MAX_REMINDERS) continue;

      // Determine which reminder to send based on time elapsed
      const nextReminderIndex = sentCount;
      const requiredHours = REMINDER_INTERVALS_HOURS[nextReminderIndex];
      if (bookingAge < requiredHours) continue;

      const messageId = `booking-reminder-${booking.id}-${nextReminderIndex + 1}`;

      // Check if this exact reminder was already sent
      const alreadySent = (sentReminders || []).some((r: any) => r.message_id === messageId);
      if (alreadySent) continue;

      // Fetch mentee and mentor profiles
      const [{ data: mentee }, { data: mentor }] = await Promise.all([
        supabase.from("profiles").select("name, email").eq("id", booking.mentee_id).single(),
        supabase.from("profiles").select("name").eq("id", booking.mentor_id).single(),
      ]);

      if (!mentee?.email) continue;

      // Fetch slot details
      const { data: slot } = await supabase
        .from("slots")
        .select("date, start_time, end_time")
        .eq("id", booking.slot_id)
        .single();

      const menteeName = mentee.name || "there";
      const mentorName = mentor?.name || "your selected mentor";
      const sessionDate = slot
        ? new Date(slot.date).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "";
      const sessionTime = slot
        ? `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`
        : "";

      const unsubToken = await getOrCreateUnsubscribeToken(supabase, mentee.email);

      const reminderNumber = nextReminderIndex + 1;
      const subject =
        reminderNumber === 1
          ? "Your Mentorship Session is Waiting — Complete Your Booking"
          : reminderNumber === 2
          ? "Gentle Reminder: Complete Your Booking — UPSC Connect"
          : "Last Reminder: Your Session Slot May Expire Soon";

      const html = buildReminderEmail(menteeName, mentorName, sessionDate, sessionTime, reminderNumber);
      const text = buildReminderText(menteeName, mentorName, sessionDate, sessionTime, reminderNumber);

      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: mentee.email,
          from: "UPSC Connect <noreply@notify.www.upscconnect.in>",
          subject,
          html,
          text,
          message_id: messageId,
          idempotency_key: messageId,
          label: "booking-reminder",
          purpose: "transactional",
          sender_domain: "notify.www.upscconnect.in",
          unsubscribe_token: unsubToken,
          queued_at: new Date().toISOString(),
        },
      });

      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "booking-reminder",
        recipient_email: mentee.email,
        status: "pending",
      });

      enqueued++;

      // Also send push notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_ids: [booking.mentee_id],
            title: "Complete Your Booking",
            body: `Your session with ${mentorName} is waiting. Complete your booking now.`,
            url: "/dashboard#bookings",
            tag: `booking-reminder-${booking.id}`,
          }),
        });
      } catch {}
    }

    console.log(`Booking reminders: ${enqueued} emails enqueued`);

    return new Response(
      JSON.stringify({ processed: enqueued }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-booking-reminders error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process booking reminders" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ──────────── Email HTML Templates ────────────

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #f7f5f2; font-family: Arial, Helvetica, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
  .card { background: #ffffff; border-radius: 12px; padding: 32px; }
  .logo { font-size: 20px; font-weight: 700; color: #2556b9; margin-bottom: 24px; }
  h1 { font-size: 22px; color: #1a1f2e; margin: 0 0 16px; }
  p { font-size: 14px; color: #55575d; line-height: 1.7; margin: 0 0 14px; }
  .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .detail-label { font-size: 13px; color: #94a3b8; }
  .detail-value { font-size: 14px; color: #1a1f2e; font-weight: 500; }
  .btn { display: inline-block; padding: 14px 32px; background: #2556b9; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 20px; }
  .help-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; }
  .help-box p { margin: 0; font-size: 13px; color: #64748b; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${baseStyles}</style></head><body><div class="container"><div class="card"><div class="logo">UPSC Connect</div>${content}</div><div class="footer"><p>Need help? Email us at <a href="mailto:admin@upscconnect.in" style="color:#2556b9;">admin@upscconnect.in</a></p><p>&copy; ${new Date().getFullYear()} UPSC Connect. All rights reserved.</p></div></div></body></html>`;
}

function buildReminderEmail(
  menteeName: string,
  mentorName: string,
  sessionDate: string,
  sessionTime: string,
  reminderNumber: number
): string {
  const greeting = `Hello ${menteeName},`;

  const bodyText =
    reminderNumber === 1
      ? `<p>We noticed you started booking a mentorship session but haven't completed the payment yet. No worries — your slot is still available.</p>
         <p>The right guidance at the right time can make a real difference in your UPSC preparation. Don't let this opportunity slip away.</p>`
      : reminderNumber === 2
      ? `<p>Just a gentle follow-up — your mentorship session booking is still pending. We understand things get busy, and we want to make sure you don't miss out.</p>
         <p>Completing your booking takes less than a minute, and your mentor is ready to help you.</p>`
      : `<p>This is our last reminder about your pending booking. We truly believe this session can add value to your preparation journey.</p>
         <p>If you faced any issues during payment or have questions, we are here to help. Just reply to this email or reach out to our support team.</p>`;

  const sessionDetails =
    sessionDate && sessionTime
      ? `<div style="margin: 20px 0;">
           <div class="detail-row"><span class="detail-label">Mentor</span><span class="detail-value">${mentorName}</span></div>
           <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${sessionDate}</span></div>
           <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${sessionTime}</span></div>
         </div>`
      : `<div style="margin: 20px 0;">
           <div class="detail-row"><span class="detail-label">Mentor</span><span class="detail-value">${mentorName}</span></div>
         </div>`;

  return emailWrapper(`
    <h1>${reminderNumber === 3 ? "Last Chance to Complete Your Booking" : "Your Session is Waiting"}</h1>
    <p>${greeting}</p>
    ${bodyText}
    ${sessionDetails}
    <a href="https://www.upscconnect.in/dashboard#bookings" class="btn">Complete Booking</a>
    <div class="help-box">
      <p>Facing an issue? We are happy to help. Reach out at <a href="mailto:admin@upscconnect.in" style="color:#2556b9;">admin@upscconnect.in</a> and we will get back to you promptly.</p>
    </div>
  `);
}

function buildReminderText(
  menteeName: string,
  mentorName: string,
  sessionDate: string,
  sessionTime: string,
  reminderNumber: number
): string {
  const intro =
    reminderNumber === 1
      ? "We noticed you started booking a mentorship session but haven't completed the payment yet."
      : reminderNumber === 2
      ? "Just a gentle follow-up — your mentorship session booking is still pending."
      : "This is our last reminder about your pending booking.";

  return `Hello ${menteeName},\n\n${intro}\n\nMentor: ${mentorName}\n${sessionDate ? `Date: ${sessionDate}\n` : ""}${sessionTime ? `Time: ${sessionTime}\n` : ""}\nComplete your booking: https://www.upscconnect.in/dashboard#bookings\n\nNeed help? Email us at admin@upscconnect.in\n\nTeam UPSC Connect`;
}
