import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useMeetingReminders } from "@/hooks/useMeetingReminders";

/**
 * Invisible component that activates browser notifications for
 * chat messages and meeting reminders when a user is logged in.
 */
export default function NotificationManager() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotifications();

  // Request permission once when user logs in
  useEffect(() => {
    if (user && permission === "default") {
      // Small delay so the page loads first
      const t = setTimeout(() => requestPermission(), 3000);
      return () => clearTimeout(t);
    }
  }, [user, permission, requestPermission]);

  // Activate global listeners
  useChatNotifications();
  useMeetingReminders();

  return null;
}
