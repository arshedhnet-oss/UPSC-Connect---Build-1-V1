import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useMeetingReminders } from "@/hooks/useMeetingReminders";
import { usePushSubscription } from "@/hooks/usePushSubscription";

/**
 * Invisible component that activates browser notifications and
 * push subscription for chat messages and meeting reminders.
 */
export default function NotificationManager() {
  const { user } = useAuth();
  const { permission } = useNotifications();
  const { subscribe } = usePushSubscription();
  const swRegistered = useRef(false);

  // Register service worker once per mount when user is logged in
  useEffect(() => {
    if (!user || swRegistered.current || !("serviceWorker" in navigator)) return;

    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }
    if (
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com")
    ) return;

    swRegistered.current = true;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] Registered, scope:", reg.scope);
        if (Notification.permission === "granted") {
          subscribe();
        }
      })
      .catch((err) => console.warn("[SW] Registration failed:", err));
  }, [user]); // deliberately omit subscribe – it's stable via module guard

  // Subscribe to push once when permission changes to granted
  useEffect(() => {
    if (permission === "granted" && user) {
      subscribe();
    }
  }, [permission, user]); // subscribe is guarded internally

  // Activate global listeners
  useChatNotifications();
  useMeetingReminders();

  return null;
}
