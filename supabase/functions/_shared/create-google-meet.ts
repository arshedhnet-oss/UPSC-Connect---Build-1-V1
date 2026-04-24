// Creates a Google Meet link via the Google Calendar API (Lovable connector gateway).
// Falls back to a Jitsi link on any failure so booking flows never break.
//
// IMPORTANT: Google Meet does NOT support per-meeting passcodes the way Jitsi does
// (Meet uses host-controlled "knocking" / waiting room). For Meet bookings, the
// caller should leave `meeting_passcode` empty. Email templates already conditionally
// hide the passcode line when it's missing.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

interface CreateMeetParams {
  bookingId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS or HH:MM
  endTime: string; // HH:MM:SS or HH:MM
  summary: string; // event title
  description?: string;
  attendeeEmails?: string[]; // optional invitees
}

export interface MeetingResult {
  url: string;
  source: "google_meet" | "jitsi_fallback";
}

function jitsiFallback(bookingId: string): string {
  const ts = Date.now();
  const roomName = `upscconnect-${bookingId.replace(/-/g, "").slice(0, 12)}-${ts}`;
  return `https://meet.jit.si/${roomName}`;
}

function normalizeTime(t: string): string {
  // Accept HH:MM or HH:MM:SS, return HH:MM:SS
  return t.length === 5 ? `${t}:00` : t;
}

export async function createGoogleMeetLink(params: CreateMeetParams): Promise<MeetingResult> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const googleCalendarApiKey = Deno.env.get("GOOGLE_CALENDAR_API_KEY");

  if (!lovableApiKey || !googleCalendarApiKey) {
    console.warn("[GoogleMeet] Connector keys missing — falling back to Jitsi");
    return { url: jitsiFallback(params.bookingId), source: "jitsi_fallback" };
  }

  const startISO = `${params.date}T${normalizeTime(params.startTime)}+05:30`;
  const endISO = `${params.date}T${normalizeTime(params.endTime)}+05:30`;

  const eventBody = {
    summary: params.summary,
    description: params.description ?? "",
    start: { dateTime: startISO, timeZone: "Asia/Kolkata" },
    end: { dateTime: endISO, timeZone: "Asia/Kolkata" },
    attendees: (params.attendeeEmails ?? [])
      .filter((e) => !!e)
      .map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `upsc-${params.bookingId}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: true },
  };

  try {
    // conferenceDataVersion=1 is required for Meet link generation
    // sendUpdates=none prevents calendar invites from going out (we send our own emails)
    const url = `${GATEWAY_URL}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": googleCalendarApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[GoogleMeet] API error [${res.status}]: ${errText}`);
      return { url: jitsiFallback(params.bookingId), source: "jitsi_fallback" };
    }

    const data = await res.json();
    const meetUrl: string | undefined =
      data?.hangoutLink ||
      data?.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri;

    if (!meetUrl) {
      console.error("[GoogleMeet] No Meet link in response, falling back. Response:", JSON.stringify(data).slice(0, 500));
      return { url: jitsiFallback(params.bookingId), source: "jitsi_fallback" };
    }

    console.log(`[GoogleMeet] Created Meet link for booking ${params.bookingId}: ${meetUrl}`);
    return { url: meetUrl, source: "google_meet" };
  } catch (err) {
    console.error("[GoogleMeet] Unexpected error:", err);
    return { url: jitsiFallback(params.bookingId), source: "jitsi_fallback" };
  }
}
