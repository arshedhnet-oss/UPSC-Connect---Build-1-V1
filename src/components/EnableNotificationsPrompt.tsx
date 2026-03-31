import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/hooks/useAuth";

export default function EnableNotificationsPrompt() {
  const { user } = useAuth();
  const { permission, requestPermission } = useNotifications();
  const { subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (permission !== "default") return;
    if (localStorage.getItem("notif-prompt-dismissed")) return;

    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [user, permission]);

  if (!visible || dismissed || !user || permission !== "default") return null;

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result === "granted") {
      console.log("[Notifications] Permission granted, subscribing...");
      subscribe();
    }
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notif-prompt-dismissed", "1");
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-card border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Enable Notifications</p>
          <p className="text-xs text-muted-foreground mt-1">
            Get instant alerts when mentors reply to your messages or sessions are booked.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleEnable}>
              Enable
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
