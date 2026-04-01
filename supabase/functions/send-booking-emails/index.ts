import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, status, mentee_id, mentor_id, slot_id, meeting_link, meeting_passcode")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      console.error("Booking not found:", bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.mentee_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept both pending_payment and confirmed statuses
    if (booking.status !== "confirmed" && booking.status !== "pending_payment") {
      return new Response(JSON.stringify({ error: "Booking not in valid state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency check
    if (booking.meeting_link) {
      return new Response(JSON.stringify({ success: true, already_sent: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the transaction (any status — frontend confirms payment via Razorpay SDK)
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id, amount, razorpay_payment_id, razorpay_order_id, status")
      .eq("booking_id", booking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!transaction) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark transaction as success if still pending (payment was confirmed client-side via Razorpay)
    if (transaction.status !== "success") {
      await supabase
        .from("transactions")
        .update({ status: "success" })
        .eq("id", transaction.id);
    }

    const { data: slot } = await supabase
      .from("slots")
      .select("date, start_time, end_time")
      .eq("id", booking.slot_id)
      .single();

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

    if (!menteeProfile || !mentorProfile || !slot) {
      console.error("Missing profile or slot data");
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate meeting link and passcode
    const { url: meetingLink } = generateMeetingLink(booking_id);
    const passcode = generatePasscode();

    // Store in booking
    await supabase
      .from("bookings")
      .update({ meeting_link: meetingLink, meeting_passcode: passcode })
      .eq("id", booking_id);

    const sessionDate = new Date(slot.date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const sessionTime = `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`;

    const calendarLink = buildCalendarLink(
      `UPSC Connect Session`,
      slot.date,
      slot.start_time.slice(0, 5),
      slot.end_time.slice(0, 5),
      meetingLink,
      `Mentorship session on UPSC Connect.\nMeeting passcode: ${passcode}\nJoin: ${meetingLink}`
    );

    // Enqueue mentee email
    const menteeMessageId = `booking-mentee-${booking_id}`;
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: menteeProfile.email,
        from: "UPSC Connect <noreply@upscconnect.in>",
        subject: "Your Mentorship Session is Confirmed — UPSC Connect",
        html: buildMenteeEmail(mentorProfile.name, sessionDate, sessionTime, meetingLink, passcode, transaction.amount, calendarLink),
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
      metadata: { booking_id, mentee_id: booking.mentee_id, meeting_created: true },
    });

    // Enqueue mentor email
    const mentorMessageId = `booking-mentor-${booking_id}`;
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
      metadata: { booking_id, mentor_id: booking.mentor_id },
    });

    // Enqueue admin email
    const adminMessageId = `booking-admin-${booking_id}`;
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: "admin@upscconnect.in",
        from: "UPSC Connect <noreply@upscconnect.in>",
        subject: "New Booking Confirmed – UPSC Connect",
        html: buildAdminEmail(
          mentorProfile.name,
          menteeProfile.name,
          sessionDate,
          sessionTime,
          transaction.amount,
          transaction.razorpay_payment_id || "N/A",
          booking_id,
          meetingLink
        ),
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
      metadata: { booking_id },
    });

    console.log(`Booking emails enqueued for booking ${booking_id} | meeting_created: true`);

    return new Response(
      JSON.stringify({ success: true, meeting_link: meetingLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-booking-emails error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to send booking emails" }),
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
