import { useEffect, useRef, useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  created_at: string;
  is_read: boolean;
}

interface ChatWindowProps {
  conversationId: string;
  otherUser: { name: string; avatar_url: string | null };
  otherUserId: string;
  onBack?: () => void;
  hideHeader?: boolean;
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

export default function ChatWindow({ conversationId, otherUser, otherUserId, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const fetchMessages = async () => {
    const { data } = await supabaseUntyped
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  // Mark unread messages as read
  const markAsRead = async () => {
    if (!user) return;
    await supabaseUntyped
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

  useEffect(() => {
    fetchMessages();
    markAsRead();
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabaseUntyped
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
          scrollToBottom();
          // Mark as read if we're the receiver
          if (payload.new.receiver_id === user?.id) {
            supabaseUntyped
              .from("messages")
              .update({ is_read: true })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => { supabaseUntyped.removeChannel(channel); };
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    const { error } = await supabaseUntyped.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: otherUserId,
      message_text: newMessage.trim(),
    });
    if (!error) setNewMessage("");
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-9 w-9">
          <AvatarImage src={otherUser.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {otherUser.name?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm text-foreground">{otherUser.name}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Start the conversation by sending a message
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card text-card-foreground border border-border rounded-bl-md"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                <div className={cn(
                  "flex items-center gap-1 mt-1",
                  isMine ? "justify-end" : "justify-start"
                )}>
                  <span className={cn(
                    "text-[10px]",
                    isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {formatMessageTime(msg.created_at)}
                  </span>
                  {isMine && (
                    <span className={cn(
                      "text-[10px]",
                      msg.is_read ? "text-primary-foreground/90" : "text-primary-foreground/50"
                    )}>
                      {msg.is_read ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-border bg-card">
        <Input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1"
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
