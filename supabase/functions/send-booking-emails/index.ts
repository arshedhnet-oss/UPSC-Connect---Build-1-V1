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

    // Confirm booking and mark slot as booked (using service role, bypasses RLS)
    if (booking.status !== "confirmed") {
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", booking_id);
      await supabase
        .from("slots")
        .update({ is_booked: true })
        .eq("id", booking.slot_id);
      console.log(`Booking ${booking_id} confirmed and slot marked as booked`);
    }

    const { data: slot } = await supabase
      .from("slots")
      .select("date, start_time, end_time")
      .eq("id", booking.slot_id)
      .single();

    const { data: menteeProfile } = await supabase
      .from("profiles")
      .select("name, email, phone")
      .eq("id", booking.mentee_id)
      .single();

    const { data: mentorProfile } = await supabase
      .from("profiles")
      .select("name, email, phone")
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

    // Generate unsubscribe tokens for all recipients
    const [menteeUnsubToken, mentorUnsubToken, adminUnsubToken] = await Promise.all([
      getOrCreateUnsubscribeToken(supabase, menteeProfile.email),
      getOrCreateUnsubscribeToken(supabase, mentorProfile.email),
      getOrCreateUnsubscribeToken(supabase, "admin@upscconnect.in"),
    ]);

    // Enqueue mentee email
    const menteeMessageId = `booking-mentee-${booking_id}`;
    const menteeHtml = buildMenteeEmail(mentorProfile.name, sessionDate, sessionTime, meetingLink, passcode, transaction.amount, calendarLink);
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: menteeProfile.email,
        from: "UPSC Connect <noreply@notify.www.upscconnect.in>",
        subject: "Your Mentorship Session is Confirmed — UPSC Connect",
        html: menteeHtml,
        text: `Your session is confirmed!\n\nMentor: ${mentorProfile.name}\nDate: ${sessionDate}\nTime: ${sessionTime}\nMeeting Link: ${meetingLink}\nPasscode: ${passcode}\nAmount Paid: ₹${transaction.amount}\n\nPlease join 5 minutes early.`,
        message_id: menteeMessageId,
        idempotency_key: menteeMessageId,
        label: "booking-mentee",
        purpose: "transactional",
        sender_domain: "notify.www.upscconnect.in",
        unsubscribe_token: menteeUnsubToken,
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
    const mentorHtml = buildMentorEmail(menteeProfile.name, menteeProfile.email, menteeProfile.phone, sessionDate, sessionTime, meetingLink, passcode, calendarLink);
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: mentorProfile.email,
        from: "UPSC Connect <noreply@notify.www.upscconnect.in>",
        subject: "New Mentorship Session Booked — UPSC Connect",
        html: mentorHtml,
        text: `New session booked!\n\nMentee: ${menteeProfile.name}\nDate: ${sessionDate}\nTime: ${sessionTime}\nMeeting Link: ${meetingLink}\nPasscode: ${passcode}\n\nPlease be available at the scheduled time.`,
        message_id: mentorMessageId,
        idempotency_key: mentorMessageId,
        label: "booking-mentor",
        purpose: "transactional",
        sender_domain: "notify.www.upscconnect.in",
        unsubscribe_token: mentorUnsubToken,
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
    const adminHtml = buildAdminEmail(
      mentorProfile.name, mentorProfile.email, mentorProfile.phone,
      menteeProfile.name, menteeProfile.email, menteeProfile.phone,
      sessionDate, sessionTime, transaction.amount, transaction.razorpay_payment_id || "N/A", booking_id, meetingLink
    );
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: "admin@upscconnect.in",
        from: "UPSC Connect <noreply@notify.www.upscconnect.in>",
        subject: "New Booking Confirmed – UPSC Connect",
        html: adminHtml,
        text: `New booking confirmed!\n\nMentor: ${mentorProfile.name}\nMentee: ${menteeProfile.name}\nDate: ${sessionDate}\nTime: ${sessionTime}\nAmount: ₹${transaction.amount}\nPayment ID: ${transaction.razorpay_payment_id || "N/A"}\nBooking ID: ${booking_id}\nMeeting: ${meetingLink}`,
        message_id: adminMessageId,
        idempotency_key: adminMessageId,
        label: "booking-admin",
        purpose: "transactional",
        sender_domain: "notify.www.upscconnect.in",
        unsubscribe_token: adminUnsubToken,
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

const LOGO_URL = "https://https-upscconnect-in.lovable.app/favicon.ico";

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif; -webkit-text-size-adjust: 100%; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
  .card { background: #ffffff; border-radius: 10px; overflow: hidden; }
  .card-header { padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid #eef0f3; }
  .logo { height: 40px; width: auto; margin-bottom: 16px; }
  .card-body { padding: 28px 32px; }
  .card-footer { padding: 20px 32px; background: #f9fafb; text-align: center; border-top: 1px solid #eef0f3; }
  h1 { font-size: 20px; font-weight: 700; color: #1a1f2e; margin: 0 0 6px; line-height: 1.3; }
  .subtitle { font-size: 14px; color: #64748b; margin: 0 0 0; line-height: 1.5; }
  .section-title { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 12px; }
  .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .detail-table td { padding: 10px 0; border-bottom: 1px solid #f0f1f3; font-size: 14px; line-height: 1.5; vertical-align: top; }
  .detail-table tr:last-child td { border-bottom: none; }
  .detail-label { color: #94a3b8; width: 130px; font-weight: 500; }
  .detail-value { color: #1a1f2e; font-weight: 500; }
  .passcode-box { background: #f0f4ff; border: 1px solid #d0daf0; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px; }
  .passcode-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1.2px; margin: 0 0 6px; font-weight: 600; }
  .passcode-value { font-size: 26px; font-weight: 700; color: #2556b9; font-family: 'Courier New', monospace; letter-spacing: 4px; margin: 0; }
  .btn-primary { display: inline-block; padding: 12px 32px; background: #2556b9; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; text-align: center; }
  .btn-secondary { display: inline-block; padding: 10px 24px; background: #ffffff; color: #2556b9 !important; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #d0daf0; }
  .btn-row { text-align: center; margin: 24px 0 8px; }
  .tip { font-size: 13px; color: #94a3b8; margin: 16px 0 0; line-height: 1.5; text-align: center; }
  .footer-text { font-size: 12px; color: #94a3b8; margin: 0 0 6px; line-height: 1.6; }
  .footer-text a { color: #2556b9; text-decoration: none; }
  .divider { border: none; border-top: 1px solid #eef0f3; margin: 24px 0; }
  @media only screen and (max-width: 620px) {
    .wrapper { padding: 12px 8px !important; }
    .card-header, .card-body, .card-footer { padding-left: 20px !important; padding-right: 20px !important; }
    .btn-primary, .btn-secondary { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    .btn-secondary { margin-top: 10px !important; }
    .detail-label { width: 100px !important; }
  }
`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head><body><div class="wrapper"><div class="card"><div class="card-header"><img src="${LOGO_URL}" alt="UPSC Connect" class="logo" />${content.split("<!--HEADER_END-->")[0]}</div><div class="card-body">${content.split("<!--HEADER_END-->")[1]?.split("<!--BODY_END-->")[0] || ""}</div><div class="card-footer"><p class="footer-text">Need help? Email us at <a href="mailto:admin@upscconnect.in">admin@upscconnect.in</a></p><p class="footer-text">&copy; ${new Date().getFullYear()} UPSC Connect. All rights reserved.</p></div></div></div></body></html>`;
}

function detailRow(label: string, value: string, mono = false): string {
  const style = mono ? ' style="font-family:Courier New,monospace;font-size:12px;"' : '';
  return `<tr><td class="detail-label">${label}</td><td class="detail-value"${style}>${value}</td></tr>`;
}

function buildMenteeEmail(mentorName: string, date: string, time: string, meetingLink: string, passcode: string, amount: number, calendarLink: string): string {
  const header = `<h1>Booking Confirmed</h1><p class="subtitle">Your mentorship session has been successfully booked.</p><!--HEADER_END-->`;
  const details = `
    <p class="section-title">Session Details</p>
    <table class="detail-table">
      ${detailRow("Mentor", mentorName)}
      ${detailRow("Date", date)}
      ${detailRow("Time", time)}
      ${detailRow("Amount Paid", `&#8377;${amount}`)}
    </table>
    <hr class="divider" />
    <p class="section-title">Meeting Details</p>
    <div class="passcode-box">
      <p class="passcode-label">Meeting Passcode</p>
      <p class="passcode-value">${passcode}</p>
    </div>
    <div class="btn-row">
      <a href="${meetingLink}" class="btn-primary">Join Meeting</a>
    </div>
    <div class="btn-row" style="margin-top:10px;">
      <a href="${calendarLink}" class="btn-secondary">Add to Calendar</a>
    </div>
    <p class="tip">Please join 5 minutes early to ensure a smooth start.</p>
  <!--BODY_END-->`;
  return emailWrapper(header + details);
}

function buildMentorEmail(menteeName: string, date: string, time: string, meetingLink: string, passcode: string, calendarLink: string): string {
  const header = `<h1>New Session Booked</h1><p class="subtitle">A mentee has booked a session with you.</p><!--HEADER_END-->`;
  const details = `
    <p class="section-title">Session Details</p>
    <table class="detail-table">
      ${detailRow("Mentee", menteeName)}
      ${detailRow("Date", date)}
      ${detailRow("Time", time)}
    </table>
    <hr class="divider" />
    <p class="section-title">Meeting Details</p>
    <div class="passcode-box">
      <p class="passcode-label">Meeting Passcode</p>
      <p class="passcode-value">${passcode}</p>
    </div>
    <div class="btn-row">
      <a href="${meetingLink}" class="btn-primary">Join Meeting</a>
    </div>
    <div class="btn-row" style="margin-top:10px;">
      <a href="${calendarLink}" class="btn-secondary">Add to Calendar</a>
    </div>
    <p class="tip">Please be available at the scheduled time.</p>
  <!--BODY_END-->`;
  return emailWrapper(header + details);
}

function buildAdminEmail(
  mentorName: string, menteeName: string, date: string, time: string,
  amount: number, paymentId: string, bookingId: string, meetingLink: string
): string {
  const header = `<h1>New Booking Confirmed</h1><p class="subtitle">A new session has been booked on the platform.</p><!--HEADER_END-->`;
  const details = `
    <p class="section-title">Session Details</p>
    <table class="detail-table">
      ${detailRow("Mentor", mentorName)}
      ${detailRow("Mentee", menteeName)}
      ${detailRow("Date", date)}
      ${detailRow("Time", time)}
      ${detailRow("Amount", `&#8377;${amount}`)}
    </table>
    <hr class="divider" />
    <p class="section-title">Transaction Details</p>
    <table class="detail-table">
      ${detailRow("Payment ID", paymentId, true)}
      ${detailRow("Booking ID", bookingId, true)}
    </table>
    <div class="btn-row">
      <a href="${meetingLink}" class="btn-primary">View Meeting Link</a>
    </div>
  <!--BODY_END-->`;
  return emailWrapper(header + details);
}
