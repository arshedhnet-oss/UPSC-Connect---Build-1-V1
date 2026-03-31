import { useEffect, useRef } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const REMINDER_MINUTES = 30;
const CHECK_INTERVAL_MS = 60_000; // check every minute

export function useMeetingReminders() {
  const { user, profile } = useAuth();
  const { showNotification } = useNotifications();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !profile) return;

    const checkUpcoming = async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() + (REMINDER_MINUTES - 1) * 60_000);
      const windowEnd = new Date(now.getTime() + (REMINDER_MINUTES + 1) * 60_000);

      const today = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

      const { data: bookings } = await supabaseUntyped
        .from("bookings")
        .select("id, mentor_id, mentee_id, status, meeting_link, slots(date, start_time, end_time), mentor:profiles!bookings_mentor_id_fkey(name), mentee:profiles!bookings_mentee_id_fkey(name)")
        .eq("status", "confirmed")
        .or(`mentee_id.eq.${user.id},mentor_id.eq.${user.id}`);

      if (!bookings) return;

      for (const b of bookings) {
        if (notifiedRef.current.has(b.id)) continue;
        const slot = (b as any).slots;
        if (!slot) continue;

        const sessionTime = new Date(`${slot.date}T${slot.start_time}`);
        if (sessionTime >= windowStart && sessionTime <= windowEnd) {
          notifiedRef.current.add(b.id);

          const isMentor = b.mentor_id === user.id;
          const otherName = isMentor ? (b as any).mentee?.name : (b as any).mentor?.name;
          const timeStr = slot.start_time?.slice(0, 5);

          showNotification("Session Starting Soon! ⏰", {
            body: `Your session with ${otherName || "your partner"} starts at ${timeStr}. Get ready to join!`,
            tag: `meeting-reminder-${b.id}`,
            data: { url: "/dashboard" },
          });
        }
      }
    };

    checkUpcoming();
    const interval = setInterval(checkUpcoming, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, profile, showNotification]);
}
