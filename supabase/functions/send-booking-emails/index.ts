import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateMeetingLink(bookingId: string): string {
  const roomName = `upsc-connect-${bookingId.slice(0, 8)}`;
  return `https://meet.jit.si/${roomName}`;
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

    // Verify authenticated user
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

    // Use service role for full access
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get booking with related data
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, status, mentee_id, mentor_id, slot_id, meeting_link")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      console.error("Booking not found:", bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller is the mentee
    if (booking.mentee_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status !== "confirmed") {
      return new Response(JSON.stringify({ error: "Booking not confirmed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if emails already sent (idempotency via meeting_link presence)
    if (booking.meeting_link) {
      return new Response(JSON.stringify({ success: true, already_sent: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get transaction to verify payment
    const { data: transaction } = await supabase
      .from("transactions")
      .select("amount, razorpay_payment_id, status")
      .eq("booking_id", booking_id)
      .eq("status", "success")
      .single();

    if (!transaction) {
      return new Response(JSON.stringify({ error: "Payment not confirmed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get slot details
    const { data: slot } = await supabase
      .from("slots")
      .select("date, start_time, end_time")
      .eq("id", booking.slot_id)
      .single();

    // Get mentee and mentor profiles
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

    // Generate meeting link
    const meetingLink = generateMeetingLink(booking_id);

    // Store meeting link in booking
    await supabase
      .from("bookings")
      .update({ meeting_link: meetingLink })
      .eq("id", booking_id);

    const sessionDate = new Date(slot.date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const sessionTime = `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;

    // Enqueue mentee email
    const menteeMessageId = `booking-mentee-${booking_id}`;
    await supabase.rpc("enqueue_email", {
      p_queue_name: "transactional_emails",
      p_message_id: menteeMessageId,
      p_template_name: "booking-mentee",
      p_recipient_email: menteeProfile.email,
      p_subject: "Your Mentorship Session is Confirmed — UPSC Connect",
      p_html: buildMenteeEmail(mentorProfile.name, sessionDate, sessionTime, meetingLink, transaction.amount),
      p_metadata: JSON.stringify({ booking_id, mentee_id: booking.mentee_id }),
    });

    // Enqueue mentor email
    const mentorMessageId = `booking-mentor-${booking_id}`;
    await supabase.rpc("enqueue_email", {
      p_queue_name: "transactional_emails",
      p_message_id: mentorMessageId,
      p_template_name: "booking-mentor",
      p_recipient_email: mentorProfile.email,
      p_subject: "New Session Booked — UPSC Connect",
      p_html: buildMentorEmail(menteeProfile.name, sessionDate, sessionTime, meetingLink),
      p_metadata: JSON.stringify({ booking_id, mentor_id: booking.mentor_id }),
    });

    // Enqueue admin email
    const adminMessageId = `booking-admin-${booking_id}`;
    await supabase.rpc("enqueue_email", {
      p_queue_name: "transactional_emails",
      p_message_id: adminMessageId,
      p_template_name: "booking-admin",
      p_recipient_email: "admin@upscconnect.in",
      p_subject: "New Booking on UPSC Connect",
      p_html: buildAdminEmail(
        mentorProfile.name,
        menteeProfile.name,
        sessionDate,
        sessionTime,
        transaction.amount,
        transaction.razorpay_payment_id || "N/A",
        booking_id
      ),
      p_metadata: JSON.stringify({ booking_id }),
    });

    console.log(`Booking emails enqueued for booking ${booking_id}`);

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
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${baseStyles}</style></head><body><div class="container"><div class="card"><div class="logo">UPSC Connect</div>${content}</div><div class="footer"><p>Need help? Email us at <a href="mailto:support@upscconnect.in" style="color:#2556b9;">support@upscconnect.in</a></p><p>© ${new Date().getFullYear()} UPSC Connect. All rights reserved.</p></div></div></body></html>`;
}

function buildMenteeEmail(mentorName: string, date: string, time: string, meetingLink: string, amount: number): string {
  return emailWrapper(`
    <h1>Your Mentorship Session is Confirmed! 🎉</h1>
    <p>Great news! Your session has been successfully booked and payment confirmed.</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentor</span><span class="detail-value">${mentorName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
      <div class="detail-row"><span class="detail-label">Amount Paid</span><span class="detail-value">₹${amount}</span></div>
    </div>
    <a href="${meetingLink}" class="btn">Join Session</a>
    <p style="margin-top: 16px; font-size: 13px; color: #94a3b8;">💡 Please join 5 minutes early to ensure a smooth start.</p>
  `);
}

function buildMentorEmail(menteeName: string, date: string, time: string, meetingLink: string): string {
  return emailWrapper(`
    <h1>New Session Booked 📅</h1>
    <p>A mentee has booked a session with you. Here are the details:</p>
    <div style="margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Mentee</span><span class="detail-value">${menteeName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${time}</span></div>
    </div>
    <a href="${meetingLink}" class="btn">Join Session</a>
    <p style="margin-top: 16px; font-size: 13px; color: #94a3b8;">Please be available at the scheduled time.</p>
  `);
}

function buildAdminEmail(
  mentorName: string, menteeName: string, date: string, time: string,
  amount: number, paymentId: string, bookingId: string
): string {
  return emailWrapper(`
    <h1>New Booking on UPSC Connect</h1>
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
  `);
}
