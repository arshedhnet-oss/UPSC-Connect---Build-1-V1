import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendStageEmail } from "../_shared/send-stage-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "admin@upscconnect.in";
const FREE_SESSION_LIMIT = 2;
const FREE_SESSION_STATUS = "free_session_confirmed";

const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateMeetingId(bookingId: string): string {
  return `UPSC-${bookingId.slice(0, 8)}`;
}

function generatePasscode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function normalizePhone(input: string): string {
  return input.replace(/\D/g, "").replace(/^91/, "").slice(-10);
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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { slot_id, name, phone, whatsapp, email } = body;

    // Validation
    if (!slot_id || !name?.trim() || !email?.trim() || !phone?.trim() || !whatsapp?.trim()) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cleanPhone = normalizePhone(phone);
    const cleanWhatsapp = normalizePhone(whatsapp);
    if (!PHONE_REGEX.test(cleanPhone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!PHONE_REGEX.test(cleanWhatsapp)) {
      return new Response(JSON.stringify({ error: "Invalid WhatsApp number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Server-side limit check
    const { count: usedCount, error: countErr } = await adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("mentee_id", user.id)
      .eq("status", FREE_SESSION_STATUS);

    if (countErr) {
      console.error("[FreeSession] count error", countErr);
      return new Response(JSON.stringify({ error: "Could not verify session limit" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((usedCount ?? 0) >= FREE_SESSION_LIMIT) {
      return new Response(JSON.stringify({
        error: "limit_reached",
        message: `You've already used your ${FREE_SESSION_LIMIT} free sessions. You can continue with paid mentorship.`,
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find Chat Mentor
    const { data: chatMentor } = await adminClient
      .from("mentor_profiles")
      .select("user_id")
      .eq("is_default_chat_mentor", true)
      .eq("is_approved", true)
      .maybeSingle();
    if (!chatMentor?.user_id) {
      return new Response(JSON.stringify({ error: "No mentor available right now. Please try again later." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mentorId = chatMentor.user_id as string;

    // Validate slot belongs to chat mentor and is bookable
    const { data: slot, error: slotErr } = await adminClient
      .from("slots")
      .select("*")
      .eq("id", slot_id)
      .eq("mentor_id", mentorId)
      .eq("is_active", true)
      .maybeSingle();
    if (slotErr || !slot) {
      return new Response(JSON.stringify({ error: "Selected slot is not available" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (slot.is_booked) {
      return new Response(JSON.stringify({ error: "This slot was just booked. Please pick another." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate guard: prevent same user booking same slot or any free session in the last 2 minutes
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { count: recentCount } = await adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("mentee_id", user.id)
      .eq("status", FREE_SESSION_STATUS)
      .gte("created_at", twoMinAgo);
    if ((recentCount ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Please wait a moment before booking again." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create booking
    const { data: booking, error: bookErr } = await adminClient
      .from("bookings")
      .insert({
        mentee_id: user.id,
        mentor_id: mentorId,
        slot_id: slot.id,
        status: FREE_SESSION_STATUS,
      })
      .select()
      .single();
    if (bookErr || !booking) {
      console.error("[FreeSession] booking insert failed", bookErr);
      return new Response(JSON.stringify({ error: "Could not create booking" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate meeting + mark slot booked
    const meetingLink = `https://meet.jit.si/${generateMeetingId(booking.id)}`;
    const passcode = generatePasscode();
    await adminClient.from("bookings").update({
      meeting_link: meetingLink,
      meeting_passcode: passcode,
    }).eq("id", booking.id);
    await adminClient.from("slots").update({ is_booked: true }).eq("id", slot.id);

    const sessionNumber = (usedCount ?? 0) + 1;

    // Profile lookups
    const { data: mentorProfile } = await adminClient.from("profiles").select("name, email").eq("id", mentorId).single();

    const sessionDate = new Date(slot.date).toLocaleDateString("en-IN", {
      weekday: "short", year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Kolkata",
    });
    const sessionTime = `${String(slot.start_time).slice(0, 5)} – ${String(slot.end_time).slice(0, 5)}`;

    const ctx = { requestId: booking.id, stage: "free_session_booked" };

    // Notifications + chat message
    try {
      // In-app notifications
      await adminClient.from("notifications").insert([
        {
          user_id: user.id,
          type: "free_session_confirmed",
          title: "Free session booked!",
          message: `Your free 1:1 session with ${mentorProfile?.name ?? "your mentor"} is scheduled for ${sessionDate} at ${sessionTime}.`,
          metadata: { booking_id: booking.id, meeting_link: meetingLink, session_number: sessionNumber },
        },
        {
          user_id: mentorId,
          type: "free_session_booked",
          title: "New free session booked",
          message: `${name.trim()} booked a free 1:1 for ${sessionDate} at ${sessionTime}.`,
          metadata: {
            booking_id: booking.id,
            mentee_id: user.id,
            mentee_name: name.trim(),
            mentee_email: email.trim(),
            mentee_phone: cleanPhone,
            mentee_whatsapp: cleanWhatsapp,
            session_number: sessionNumber,
          },
        },
      ]);

      // Auto-message in chat: ensure conversation exists, then post message
      const { data: existingConv } = await adminClient
        .from("conversations")
        .select("id")
        .eq("mentor_id", mentorId)
        .eq("mentee_id", user.id)
        .maybeSingle();
      let conversationId = existingConv?.id as string | undefined;
      if (!conversationId) {
        const { data: newConv } = await adminClient
          .from("conversations")
          .insert({ mentor_id: mentorId, mentee_id: user.id })
          .select("id")
          .single();
        conversationId = newConv?.id;
      }
      if (conversationId) {
        const msg = `Your free 1:1 session has been scheduled for ${sessionDate} at ${sessionTime}.\n\nMeeting link: ${meetingLink}\nPasscode: ${passcode}`;
        await adminClient.from("messages").insert({
          conversation_id: conversationId,
          sender_id: mentorId,
          receiver_id: user.id,
          message_text: msg,
        });
      }
    } catch (e) {
      console.error("[FreeSession] notification/chat error (non-fatal):", e);
    }

    // Emails — mentee, mentor, admin
    const baseData = {
      menteeName: name.trim(),
      mentorName: mentorProfile?.name ?? "your mentor",
      sessionDate,
      sessionTime,
      meetingLink,
      meetingPasscode: passcode,
      sessionNumber,
      menteeEmail: email.trim(),
      menteePhone: cleanPhone,
      menteeWhatsapp: cleanWhatsapp,
    };

    await sendStageEmail(adminClient, "free-session-confirmed", email.trim(), `free-session-mentee-${booking.id}`, {
      ...baseData, recipientName: name.trim(), audience: "mentee",
    }, ctx);

    if (mentorProfile?.email) {
      await sendStageEmail(adminClient, "free-session-confirmed", mentorProfile.email, `free-session-mentor-${booking.id}`, {
        ...baseData, recipientName: mentorProfile.name ?? "Mentor", audience: "mentor",
      }, ctx);
    }

    await sendStageEmail(adminClient, "free-session-confirmed", ADMIN_EMAIL, `free-session-admin-${booking.id}`, {
      ...baseData, recipientName: "Admin", audience: "admin",
    }, ctx);

    return new Response(JSON.stringify({
      success: true,
      booking_id: booking.id,
      meeting_link: meetingLink,
      meeting_passcode: passcode,
      session_date: sessionDate,
      session_time: sessionTime,
      session_number: sessionNumber,
      mentor_name: mentorProfile?.name ?? null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[FreeSession] unhandled error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
