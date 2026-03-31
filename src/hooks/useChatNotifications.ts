import { useEffect } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Global listener for incoming chat messages.
 * Shows a browser notification when a message arrives and the tab is not focused.
 */
export function useChatNotifications() {
  const { user } = useAuth();
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (!user) return;

    const channel = supabaseUntyped
      .channel("global-chat-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg || msg.sender_id === user.id) return;

          // Fetch sender name
          const { data: sender } = await supabaseUntyped
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", msg.sender_id)
            .single();

          const senderName = sender?.name || "Someone";

          showNotification(`New message from ${senderName}`, {
            body: msg.message_text?.slice(0, 100) || "You have a new message",
            tag: `chat-${msg.conversation_id}`,
            data: { url: `/chat?conversation=${msg.conversation_id}` },
          });
        }
      )
      .subscribe();

    return () => {
      supabaseUntyped.removeChannel(channel);
    };
  }, [user, showNotification]);
}
