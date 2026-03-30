import { useEffect, useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  mentee_id: string;
  mentor_id: string;
  created_at: string;
  other_user: { name: string; avatar_url: string | null };
  last_message?: { message_text: string; created_at: string; sender_id: string };
  unread_count: number;
}

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
}

export default function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: convs } = await supabaseUntyped
      .from("conversations")
      .select("*")
      .or(`mentee_id.eq.${user.id},mentor_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    const enriched: Conversation[] = await Promise.all(
      convs.map(async (conv: any) => {
        const otherId = conv.mentee_id === user.id ? conv.mentor_id : conv.mentee_id;

        const { data: otherProfile } = await supabaseUntyped
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", otherId)
          .single();

        const { data: lastMsg } = await supabaseUntyped
          .from("messages")
          .select("message_text, created_at, sender_id")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count } = await supabaseUntyped
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("receiver_id", user.id)
          .eq("is_read", false);

        return {
          ...conv,
          other_user: otherProfile || { name: "Unknown", avatar_url: null },
          last_message: lastMsg || undefined,
          unread_count: count || 0,
        };
      })
    );

    // Sort by last message time
    enriched.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setConversations(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Listen for new messages to refresh list
  useEffect(() => {
    if (!user) return;
    const channel = supabaseUntyped
      .channel("conv-list-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabaseUntyped.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-12 px-4 text-center">
        <p className="font-medium">No conversations yet</p>
        <p className="text-xs mt-1">
          {profile?.role === "mentee"
            ? "Visit a mentor's profile to start a conversation"
            : "Mentees will reach out to you here"}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
              selectedId === conv.id && "bg-muted"
            )}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={conv.other_user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {conv.other_user.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm text-foreground truncate">
                  {conv.other_user.name}
                </p>
                {conv.last_message && (
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-muted-foreground truncate">
                  {conv.last_message
                    ? `${conv.last_message.sender_id === user?.id ? "You: " : ""}${conv.last_message.message_text}`
                    : "No messages yet"}
                </p>
                {conv.unread_count > 0 && (
                  <Badge className="ml-2 shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] bg-primary text-primary-foreground">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
