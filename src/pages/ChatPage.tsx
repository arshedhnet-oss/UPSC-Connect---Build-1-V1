import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mentorIdParam = searchParams.get("mentor");

  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user]);

  // Auto-create or open conversation from mentor param
  useEffect(() => {
    if (!user || !mentorIdParam || !profile || initializing) return;
    if (profile.role !== "mentee") return;

    const initConversation = async () => {
      setInitializing(true);

      // Check if conversation exists
      const { data: existing } = await supabaseUntyped
        .from("conversations")
        .select("*")
        .eq("mentee_id", user.id)
        .eq("mentor_id", mentorIdParam)
        .single();

      let convId: string;
      if (existing) {
        convId = existing.id;
      } else {
        const { data: created, error } = await supabaseUntyped
          .from("conversations")
          .insert({ mentee_id: user.id, mentor_id: mentorIdParam })
          .select()
          .single();
        if (error || !created) { setInitializing(false); return; }
        convId = created.id;
      }

      // Fetch other user profile
      const { data: otherProfile } = await supabaseUntyped
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", mentorIdParam)
        .single();

      setSelectedConv({
        id: convId,
        mentee_id: user.id,
        mentor_id: mentorIdParam,
        other_user: otherProfile || { name: "Mentor", avatar_url: null },
      });
      setInitializing(false);
    };

    initConversation();
  }, [user, mentorIdParam, profile]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const otherUserId = selectedConv
    ? selectedConv.mentee_id === user?.id
      ? selectedConv.mentor_id
      : selectedConv.mentee_id
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        {/* Conversation list */}
        <div
          className={cn(
            "w-full md:w-80 border-r border-border bg-card flex flex-col shrink-0",
            selectedConv ? "hidden md:flex" : "flex"
          )}
        >
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Messages</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              selectedId={selectedConv?.id || null}
              onSelect={(conv) => setSelectedConv(conv)}
            />
          </div>
        </div>

        {/* Chat window */}
        <div className={cn("flex-1 flex flex-col", !selectedConv ? "hidden md:flex" : "flex")}>
          {selectedConv ? (
            <ChatWindow
              conversationId={selectedConv.id}
              otherUser={selectedConv.other_user}
              otherUserId={otherUserId!}
              onBack={() => setSelectedConv(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-8 w-8" />
              </div>
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm">Choose from your existing conversations to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
