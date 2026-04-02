import { useEffect, useRef } from "react";
import { supabaseUntyped } from "@/lib/supabase";

const AUTO_RESPONSE_MESSAGE = `Hi! I'd love to understand where you are in your UPSC journey so I can guide you better.

Could you share:
• Number of attempts so far
• The year you're preparing for

This will help me give you more relevant guidance.`;

interface UseAutoResponseParams {
  conversationId: string;
  mentorId: string;
  currentUserId: string | undefined;
  isMentee: boolean;
  onTypingIndicator: (show: boolean) => void;
}

export function useAutoResponse({
  conversationId,
  mentorId,
  currentUserId,
  isMentee,
  onTypingIndicator,
}: UseAutoResponseParams) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      cancelledRef.current = true;
    };
  }, [conversationId]);

  const triggerAutoResponse = async () => {
    if (!currentUserId || !isMentee) return;

    // Check if auto response was already sent
    const { data: conv } = await supabaseUntyped
      .from("conversations")
      .select("auto_response_sent")
      .eq("id", conversationId)
      .single();

    if (conv?.auto_response_sent) return;

    // Check message count from mentee in this conversation
    const { count: menteeMessageCount } = await supabaseUntyped
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("sender_id", currentUserId);

    // Only trigger on first message
    if ((menteeMessageCount || 0) > 1) return;

    // Random delay between 25-40 seconds
    const delay = (25 + Math.random() * 15) * 1000;
    cancelledRef.current = false;

    clearTimer();
    timerRef.current = setTimeout(async () => {
      if (cancelledRef.current) return;

      // Re-check: has mentor replied? Has auto-response been sent?
      const { data: freshConv } = await supabaseUntyped
        .from("conversations")
        .select("auto_response_sent")
        .eq("id", conversationId)
        .single();

      if (freshConv?.auto_response_sent) return;

      const { data: mentorMessages, error: mmErr } = await supabaseUntyped
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("sender_id", mentorId)
        .limit(1);

      if (mmErr || (mentorMessages && mentorMessages.length > 0)) return;
      if (cancelledRef.current) return;

      // Show typing indicator for 2-3 seconds
      onTypingIndicator(true);
      const typingDelay = 2000 + Math.random() * 1000;

      await new Promise((resolve) => setTimeout(resolve, typingDelay));
      if (cancelledRef.current) {
        onTypingIndicator(false);
        return;
      }

      // Send the auto-response message
      const { error: insertErr } = await supabaseUntyped.from("messages").insert({
        conversation_id: conversationId,
        sender_id: mentorId,
        receiver_id: currentUserId,
        message_text: AUTO_RESPONSE_MESSAGE,
      });

      onTypingIndicator(false);

      if (!insertErr) {
        // Mark auto response as sent
        await supabaseUntyped
          .from("conversations")
          .update({ auto_response_sent: true })
          .eq("id", conversationId);
      }
    }, delay);
  };

  const cancelAutoResponse = () => {
    cancelledRef.current = true;
    clearTimer();
    onTypingIndicator(false);
  };

  return { triggerAutoResponse, cancelAutoResponse };
}
