import { useEffect, useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }

    const fetchCount = async () => {
      const { count: c } = await supabaseUntyped
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      setCount(c ?? 0);
    };

    fetchCount();

    // Listen for new messages & read updates
    const channel = supabaseUntyped
      .channel("unread-count")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      }, () => { fetchCount(); })
      .subscribe();

    return () => { supabaseUntyped.removeChannel(channel); };
  }, [user]);

  return count;
}
