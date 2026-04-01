import { useCallback, useRef } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const VAPID_PUBLIC_KEY = "BI-mcasrfTeWUES2tht2tND86n88F23QLoaNO4bkvtDbxqF7cGuoXZYOBR7uOBGHzVVk1znZOPCTkQ778NNfrA8";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Module-level guard: ensures subscribe runs at most once per page load
let hasSubscribed = false;

export function usePushSubscription() {
  const { user } = useAuth();
  const subscribingRef = useRef(false);

  const subscribe = useCallback(async () => {
    if (!user) return;
    if (hasSubscribed || subscribingRef.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    subscribingRef.current = true;

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
      }

      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return;

      // Check if this exact subscription already exists in DB
      const { data: existing } = await supabaseUntyped
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("endpoint", subJson.endpoint)
        .maybeSingle();

      if (existing) {
        console.log("[Push] Subscription already exists, skipping upsert");
        hasSubscribed = true;
        return;
      }

      await supabaseUntyped.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
          device_type: /mobile|android|iphone/i.test(navigator.userAgent) ? "mobile" : "desktop",
        },
        { onConflict: "user_id,endpoint" }
      );

      console.log("[Push] Subscription saved");
      hasSubscribed = true;
    } catch (err) {
      console.warn("[Push] Subscription failed:", err);
    } finally {
      subscribingRef.current = false;
    }
  }, [user]);

  return { subscribe };
}
