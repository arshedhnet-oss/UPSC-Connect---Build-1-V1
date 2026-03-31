import { useEffect } from "react";
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

  // Register service worker when user is logged in
  useEffect(() => {
    if (!user || !("serviceWorker" in navigator)) return;

    // Don't register SW in iframes or preview hosts
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }
    if (
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com")
    ) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] Registered, scope:", reg.scope);
        if (Notification.permission === "granted") {
          subscribe();
        }
      })
      .catch((err) => console.warn("[SW] Registration failed:", err));
  }, [user, subscribe]);

  // Subscribe to push when permission changes to granted
  useEffect(() => {
    if (permission === "granted" && user) {
      console.log("[Notifications] Permission granted, subscribing to push...");
      subscribe();
    }
  }, [permission, user, subscribe]);

  // Activate global listeners
  useChatNotifications();
  useMeetingReminders();

  return null;
}
