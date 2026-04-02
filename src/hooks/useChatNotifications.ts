import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

/**
 * Global listener for incoming chat messages.
 * Shows a browser notification (when tab not focused) AND
 * an in-app toast popup (when not on the chat page).
 */
export function useChatNotifications() {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const location = useLocation();

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

          // Browser notification (when tab not focused)
          showNotification(`New message from ${senderName}`, {
            body: msg.message_text?.slice(0, 100) || "You have a new message",
            tag: `chat-${msg.conversation_id}`,
            data: { url: `/chat?conversation=${msg.conversation_id}` },
          });

          // In-app toast popup — suppress when user is already on chat page
          const isOnChatPage = window.location.pathname === "/chat";
          if (!isOnChatPage) {
            toast(`💬 ${senderName}`, {
              description: msg.message_text?.slice(0, 80) || "Sent you a message",
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/chat?conversation=${msg.conversation_id}`;
                },
              },
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseUntyped.removeChannel(channel);
    };
  }, [user, showNotification]);
}
