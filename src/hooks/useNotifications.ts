import { useEffect, useState, useCallback } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as NotificationPermission;
    if (Notification.permission === "granted") {
      setPermission("granted");
      return "granted" as NotificationPermission;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      // Don't show if tab is focused
      if (document.visibilityState === "visible") return;
      try {
        const n = new Notification(title, {
          icon: "/apple-touch-icon.png",
          badge: "/favicon-32x32.png",
          ...options,
        });
        n.onclick = () => {
          window.focus();
          n.close();
          if (options?.data?.url) {
            window.location.href = options.data.url;
          }
        };
      } catch {
        // Notification API not supported
      }
    },
    []
  );

  return { permission, requestPermission, showNotification };
}
