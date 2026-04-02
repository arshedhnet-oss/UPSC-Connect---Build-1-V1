import { useEffect, useRef, useCallback } from "react";

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
    cancelledRef.current = false;
    return () => {
      clearTimer();
      cancelledRef.current = true;
      onTypingIndicator(false);
    };
  }, [conversationId]);

  const triggerAutoResponse = useCallback(async () => {
    if (!currentUserId || !isMentee) return;

    // Random delay between 25-40 seconds
    const delay = (25 + Math.random() * 15) * 1000;
    cancelledRef.current = false;

    clearTimer();
    timerRef.current = setTimeout(async () => {
      if (cancelledRef.current) return;

      // Show typing indicator for 2-3 seconds
      onTypingIndicator(true);
      const typingDelay = 2000 + Math.random() * 1000;

      await new Promise((resolve) => setTimeout(resolve, typingDelay));
      if (cancelledRef.current) {
        onTypingIndicator(false);
        return;
      }

      // Call edge function to send auto-response (uses service role, bypasses RLS)
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-auto-response`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            mentor_id: mentorId,
            mentee_id: currentUserId,
          }),
        });
      } catch {
        // Silent fail
      }

      onTypingIndicator(false);
    }, delay);
  }, [conversationId, mentorId, currentUserId, isMentee, onTypingIndicator]);

  const cancelAutoResponse = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    onTypingIndicator(false);
  }, [onTypingIndicator]);

  return { triggerAutoResponse, cancelAutoResponse };
}
