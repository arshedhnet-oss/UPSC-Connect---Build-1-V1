import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Helpers ──

function generatePasscode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (const b of arr) code += chars[b % chars.length];
  return code;
}

function generateMeetingLink(bookingId: string): { roomName: string; url: string } {
  const ts = Date.now();
  const roomName = `upscconnect-${bookingId.replace(/-/g, "").slice(0, 12)}-${ts}`;
  return { roomName, url: `https://meet.jit.si/${roomName}` };
}

function buildCalendarLink(title: string, date: string, startTime: string, endTime: string, meetingUrl: string, description: string): string {
  const start = `${date.replace(/-/g, "")}T${startTime.replace(/:/g, "")}00`;
  const end = `${date.replace(/-/g, "")}T${endTime.replace(/:/g, "")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: description,
    location: meetingUrl,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

async function verifyRazorpaySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedHex = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expectedHex === signature;
}

// ── Email Templates ──

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
  .btn-secondary { display: inline-block; padding: 10px 20px; background: #f0f4ff; color: #2556b9; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 8px; border: 1px solid #d0daf0; }
  .passcode-box { background: #f8fafc; border: 2px dashed #2556b9; border-radius: 10px; padding: 16px; text-align: center; margin: 16px 0; }
  .passcode-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; }
  .passcode-value { font-size: 24px; font-weight: 700; color: #2556b9; font-family: 'Courier New', monospace; letter-spacing: 3px; margin: 0; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${baseStyles}</style></head><body><div class="container"><div class="card"><div class="logo">UPSC Connect</div>${content}</div><div class="footer"><p>Need help? Email us at <a href="mailto:admin@upscconnect.in" style="color:#2556b9;">admin@upscconnect.in</a></p><p>© ${new Date().getFullYear()} UPSC Connect. All rights reserved.</p></div></div></body></html>`;
}

function buildMenteeEmail(mentorName: string, date: string, time: string, meetingLink: string, passcode: string, amount: number, calendarLink: string): string {
  return emailWrapper(`
    <h1>Your Mentorship Session is Confirmed! 🎉</h1>
    <p>Great news! Your session has been successfully booked and payment confirmed.</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentor</span><span class="detail-value">${mentorName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
      <div class="detail-row"><span class="detail-label">Amount Paid</span><span class="detail-value">₹${amount}</span></div>
    </div>
    <div class="passcode-box">
      <p class="passcode-label">Meeting Passcode</p>
      <p class="passcode-value">${passcode}</p>
    </div>
    <a href="${meetingLink}" class="btn">Join Meeting</a>
    <br/>
    <a href="${calendarLink}" class="btn-secondary">📅 Add to Calendar</a>
    <p style="margin-top: 16px; font-size: 13px; color: #94a3b8;">💡 Please join 5 minutes early to ensure a smooth start.</p>
  `);
}

function buildMentorEmail(menteeName: string, date: string, time: string, meetingLink: string, passcode: string, calendarLink: string): string {
  return emailWrapper(`
    <h1>New Mentorship Session Booked 📅</h1>
    <p>A mentee has booked a session with you. Here are the details:</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentee</span><span class="detail-value">${menteeName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
    </div>
    <div class="passcode-box">
      <p class="passcode-label">Meeting Passcode</p>
      <p class="passcode-value">${passcode}</p>
    </div>
    <a href="${meetingLink}" class="btn">Join Meeting</a>
    <br/>
    <a href="${calendarLink}" class="btn-secondary">📅 Add to Calendar</a>
    <p style="margin-top: 16px; font-size: 13px; color: #94a3b8;">Please be available at the scheduled time.</p>
  `);
}

function buildAdminEmail(
  mentorName: string, menteeName: string, date: string, time: string,
  amount: number, paymentId: string, bookingId: string, meetingLink: string
): string {
  return emailWrapper(`
    <h1>New Booking Confirmed – UPSC Connect</h1>
    <p>A new session has been booked on the platform.</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentor</span><span class="detail-value">${mentorName}</span></div>
      <div class="detail-row"><span class="detail-label">Mentee</span><span class="detail-value">${menteeName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
      <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">₹${amount}</span></div>
      <div class="detail-row"><span class="detail-label">Payment ID</span><span class="detail-value" style="font-family:monospace;font-size:12px;">${paymentId}</span></div>
      <div class="detail-row"><span class="detail-label">Booking ID</span><span class="detail-value" style="font-family:monospace;font-size:12px;">${bookingId}</span></div>
    </div>
    <a href="${meetingLink}" class="btn">View Meeting Link</a>
  `);
}

// ── Main Handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    console.log("webhook_received");

    // 1. Verify signature
    if (!signature) {
      console.error("signature_verification_failed: no signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifyRazorpaySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error("signature_verification_failed: invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("signature_verified");

    const payload = JSON.parse(rawBody);

    // 2. Only process payment.captured
    if (payload.event !== "payment.captured") {
      console.log(`ignoring_event: ${payload.event}`);
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Extract payment details
    const payment = payload.payload?.payment?.entity;
    if (!payment) {
      console.error("invalid_payload: no payment entity");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = payment.id;
    const orderId = payment.order_id;
    const amountPaise = payment.amount;
    const amount = Math.round(amountPaise / 100);

    console.log(`payment_details: payment_id=${paymentId}, order_id=${orderId}, amount=${amount}`);

    const supabase = createClient(supabaseUrl, serviceKey);

    // 4. Find booking via transaction's razorpay_order_id
    const { data: transaction, error: txErr } = await supabase
      .from("transactions")
      .select("id, booking_id, status")
      .eq("razorpay_order_id", orderId)
      .single();

    if (txErr || !transaction) {
      console.error("booking_not_found: no transaction for order_id", orderId, txErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`booking_found: booking_id=${transaction.booking_id}`);

    const bookingId = transaction.booking_id;

    // 5. Fetch the booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, status, mentee_id, mentor_id, slot_id, meeting_link")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      console.error("booking_fetch_failed", bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Idempotency: if already confirmed with meeting link, stop
    if (booking.status === "confirmed" && booking.meeting_link) {
      console.log("idempotency_check: already processed, skipping");
      return new Response(JSON.stringify({ status: "already_processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Update transaction with payment_id and status
    await supabase
      .from("transactions")
      .update({ razorpay_payment_id: paymentId, status: "success" })
      .eq("id", transaction.id);

    // 8. Confirm booking
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    // Mark slot as booked
    await supabase
      .from("slots")
      .update({ is_booked: true })
      .eq("id", booking.slot_id);

    console.log("booking_confirmed");

    // 9. Create Jitsi meeting
    const { url: meetingLink } = generateMeetingLink(bookingId);
    const passcode = generatePasscode();

    await supabase
      .from("bookings")
      .update({ meeting_link: meetingLink, meeting_passcode: passcode })
      .eq("id", bookingId);

    console.log("meeting_created");

    // 10. Fetch profiles and slot
    const [{ data: menteeProfile }, { data: mentorProfile }, { data: slot }] = await Promise.all([
      supabase.from("profiles").select("name, email").eq("id", booking.mentee_id).single(),
      supabase.from("profiles").select("name, email").eq("id", booking.mentor_id).single(),
      supabase.from("slots").select("date, start_time, end_time").eq("id", booking.slot_id).single(),
    ]);

    if (!menteeProfile || !mentorProfile || !slot) {
      console.error("missing_profile_or_slot_data");
      return new Response(JSON.stringify({ error: "Missing data for emails" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionDate = new Date(slot.date).toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const sessionTime = `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`;

    const calendarLink = buildCalendarLink(
      "UPSC Connect Session",
      slot.date,
      slot.start_time.slice(0, 5),
      slot.end_time.slice(0, 5),
      meetingLink,
      `Mentorship session on UPSC Connect.\nMeeting passcode: ${passcode}\nJoin: ${meetingLink}`
    );

    // 11. Enqueue emails
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured — emails will not be sent");
    }

    // Mentee email
    const menteeMessageId = `webhook-mentee-${bookingId}`;
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: menteeProfile.email,
        from: "UPSC Connect <noreply@upscconnect.in>",
        subject: "Your Mentorship Session is Confirmed — UPSC Connect",
        html: buildMenteeEmail(mentorProfile.name, sessionDate, sessionTime, meetingLink, passcode, amount, calendarLink),
        message_id: menteeMessageId,
        idempotency_key: menteeMessageId,
        label: "booking-mentee",
        purpose: "transactional",
        sender_domain: "notify.www.upscconnect.in",
        queued_at: new Date().toISOString(),
      },
    });
    await supabase.from("email_send_log").insert({
      message_id: menteeMessageId,
      template_name: "booking-mentee",
      recipient_email: menteeProfile.email,
      status: "pending",
      metadata: { booking_id: bookingId, payment_id: paymentId, source: "webhook" },
    });

    // Mentor email
    const mentorMessageId = `webhook-mentor-${bookingId}`;
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: mentorProfile.email,
        from: "UPSC Connect <noreply@upscconnect.in>",
        subject: "New Mentorship Session Booked — UPSC Connect",
        html: buildMentorEmail(menteeProfile.name, sessionDate, sessionTime, meetingLink, passcode, calendarLink),
        message_id: mentorMessageId,
        idempotency_key: mentorMessageId,
        label: "booking-mentor",
        purpose: "transactional",
        sender_domain: "notify.www.upscconnect.in",
        queued_at: new Date().toISOString(),
      },
    });
    await supabase.from("email_send_log").insert({
      message_id: mentorMessageId,
      template_name: "booking-mentor",
      recipient_email: mentorProfile.email,
      status: "pending",
      metadata: { booking_id: bookingId, payment_id: paymentId, source: "webhook" },
    });

    // Admin email
    const adminMessageId = `webhook-admin-${bookingId}`;
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: "admin@upscconnect.in",
        subject: "New Booking Confirmed – UPSC Connect",
        html: buildAdminEmail(mentorProfile.name, menteeProfile.name, sessionDate, sessionTime, amount, paymentId, bookingId, meetingLink),
        message_id: adminMessageId,
        idempotency_key: adminMessageId,
        label: "booking-admin",
        purpose: "transactional",
        sender_domain: "notify.www.upscconnect.in",
        queued_at: new Date().toISOString(),
      },
    });
    await supabase.from("email_send_log").insert({
      message_id: adminMessageId,
      template_name: "booking-admin",
      recipient_email: "admin@upscconnect.in",
      status: "pending",
      metadata: { booking_id: bookingId, payment_id: paymentId, source: "webhook" },
    });

    console.log(`email_sent_success: all 3 emails enqueued for booking ${bookingId}`);

    // 12. Send push notifications to mentee and mentor
    try {
      const pushPayload = {
        user_ids: [booking.mentee_id, booking.mentor_id],
        title: "Session Confirmed! 🎉",
        body: `Your mentorship session on ${sessionDate} at ${sessionTime} is confirmed. Tap to view details.`,
        url: "/dashboard#bookings",
        tag: `booking-${bookingId}`,
      };
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(pushPayload),
      });
      console.log("push_notifications_sent");
    } catch (pushErr) {
      console.error("push_notification_error:", pushErr);
      // Don't fail the webhook for push errors
    }

    return new Response(
      JSON.stringify({ status: "ok", booking_id: bookingId, meeting_link: meetingLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("webhook_error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
