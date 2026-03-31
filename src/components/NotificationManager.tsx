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
  const { permission, requestPermission } = useNotifications();
  const { subscribe } = usePushSubscription();

  // Request permission once when user logs in
  useEffect(() => {
    if (user && permission === "default") {
      const t = setTimeout(() => requestPermission(), 3000);
      return () => clearTimeout(t);
    }
  }, [user, permission, requestPermission]);

  // Register service worker and subscribe to push when permission granted
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
      .then(() => {
        console.log("[SW] Registered");
        if (Notification.permission === "granted") {
          subscribe();
        }
      })
      .catch((err) => console.warn("[SW] Registration failed:", err));
  }, [user, subscribe]);

  // Re-subscribe when permission changes to granted
  useEffect(() => {
    if (permission === "granted" && user) {
      subscribe();
    }
  }, [permission, user, subscribe]);

  // Activate global listeners
  useChatNotifications();
  useMeetingReminders();

  return null;
}
