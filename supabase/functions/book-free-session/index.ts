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
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}:\d{2}$/;

// Allowed fixed slots (IST). Server enforces this — clients cannot bypass.
const ALLOWED_SLOTS: Record<string, { end: string; label: string }> = {
  "10:30:00": { end: "11:00:00", label: "10:30 AM – 11:00 AM" },
  "11:00:00": { end: "11:30:00", label: "11:00 AM – 11:30 AM" },
  "11:30:00": { end: "12:00:00", label: "11:30 AM – 12:00 PM" },
  "12:00:00": { end: "12:30:00", label: "12:00 PM – 12:30 PM" },
};

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

// Today in Asia/Kolkata as YYYY-MM-DD
function todayIST(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA → YYYY-MM-DD
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
    const { booking_date, start_time, end_time, slot_label, name, phone, whatsapp, email } = body;

    // Validation
    if (!booking_date || !start_time || !end_time || !name?.trim() || !email?.trim() || !phone?.trim() || !whatsapp?.trim()) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!DATE_REGEX.test(booking_date) || !TIME_REGEX.test(start_time) || !TIME_REGEX.test(end_time)) {
      return new Response(JSON.stringify({ error: "Invalid date or time format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-enforced slot template
    const allowed = ALLOWED_SLOTS[start_time];
    if (!allowed || allowed.end !== end_time) {
      return new Response(JSON.stringify({ error: "Invalid time slot" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const enforcedLabel = allowed.label;

    // Server-enforced date: must be tomorrow or later (IST)
    const today = todayIST();
    if (booking_date <= today) {
      return new Response(JSON.stringify({ error: "Bookings must be for a future date (starting tomorrow)" }), {
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

    // Find or create the slot row for (mentor, date, start_time)
    const { data: existingSlot } = await adminClient
      .from("slots")
      .select("id, is_booked, is_active")
      .eq("mentor_id", mentorId)
      .eq("date", booking_date)
      .eq("start_time", start_time)
      .maybeSingle();

    let slotId: string;
    if (existingSlot) {
      if (existingSlot.is_booked || existingSlot.is_active === false) {
        return new Response(JSON.stringify({ error: "slot_taken" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      slotId = existingSlot.id;
    } else {
      // Insert a fresh slot row for this fixed template
      const { data: newSlot, error: slotInsertErr } = await adminClient
        .from("slots")
        .insert({
          mentor_id: mentorId,
          date: booking_date,
          start_time,
          end_time,
          is_active: true,
          is_booked: false,
        })
        .select("id")
        .single();
      if (slotInsertErr || !newSlot) {
        // Likely a race condition — re-fetch
        const { data: raceSlot } = await adminClient
          .from("slots")
          .select("id, is_booked")
          .eq("mentor_id", mentorId)
          .eq("date", booking_date)
          .eq("start_time", start_time)
          .maybeSingle();
        if (!raceSlot || raceSlot.is_booked) {
          return new Response(JSON.stringify({ error: "slot_taken" }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        slotId = raceSlot.id;
      } else {
        slotId = newSlot.id;
      }
    }

    // Atomically claim the slot — this is the race-condition guard
    const { data: claimedSlot, error: claimErr } = await adminClient
      .from("slots")
      .update({ is_booked: true })
      .eq("id", slotId)
      .eq("is_booked", false)
      .select("id, date, start_time, end_time")
      .maybeSingle();

    if (claimErr || !claimedSlot) {
      return new Response(JSON.stringify({ error: "slot_taken" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate guard: prevent rapid-fire double submissions by same user
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { count: recentCount } = await adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("mentee_id", user.id)
      .eq("status", FREE_SESSION_STATUS)
      .gte("created_at", twoMinAgo);
    if ((recentCount ?? 0) > 0) {
      // Roll back the slot claim
      await adminClient.from("slots").update({ is_booked: false }).eq("id", slotId);
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
        slot_id: slotId,
        status: FREE_SESSION_STATUS,
      })
      .select()
      .single();
    if (bookErr || !booking) {
      console.error("[FreeSession] booking insert failed", bookErr);
      // Roll back the slot claim
      await adminClient.from("slots").update({ is_booked: false }).eq("id", slotId);
      return new Response(JSON.stringify({ error: "Could not create booking" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate meeting
    const meetingLink = `https://meet.jit.si/${generateMeetingId(booking.id)}`;
    const passcode = generatePasscode();
    await adminClient.from("bookings").update({
      meeting_link: meetingLink,
      meeting_passcode: passcode,
    }).eq("id", booking.id);

    const sessionNumber = (usedCount ?? 0) + 1;

    // Profile lookups
    const { data: mentorProfile } = await adminClient.from("profiles").select("name, email").eq("id", mentorId).single();

    const sessionDate = new Date(`${booking_date}T00:00:00+05:30`).toLocaleDateString("en-IN", {
      weekday: "short", year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Kolkata",
    });
    const sessionTime = enforcedLabel;

    const ctx = { requestId: booking.id, stage: "free_session_booked" };

    // Notifications + chat message
    try {
      await adminClient.from("notifications").insert([
        {
          user_id: user.id,
          type: "free_session_confirmed",
          title: "Free session booked!",
          message: `Your free 1:1 session with ${mentorProfile?.name ?? "your mentor"} is scheduled for ${sessionDate} at ${sessionTime}.`,
          metadata: { booking_id: booking.id, meeting_link: meetingLink, session_number: sessionNumber, slot_label: enforcedLabel },
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
            slot_label: enforcedLabel,
          },
        },
      ]);

      // Auto-message in chat
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
        const msg = `Your free 1:1 session has been scheduled for ${sessionDate} at ${sessionTime} (IST).\n\nMeeting link: ${meetingLink}\nPasscode: ${passcode}`;
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
      slot_label: enforcedLabel,
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
