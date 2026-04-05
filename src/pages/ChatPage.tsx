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
  const menteeIdParam = searchParams.get("mentee");
  const conversationIdParam = searchParams.get("conversation");

  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [initializing, setInitializing] = useState(false);

  // Lock body scroll when chat page is mounted
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user]);

  // Auto-open conversation from conversation ID param
  useEffect(() => {
    if (!user || !conversationIdParam || !profile || initializing) return;
    const openConversation = async () => {
      setInitializing(true);
      const { data: conv } = await supabaseUntyped
        .from("conversations")
        .select("*")
        .eq("id", conversationIdParam)
        .single();
      if (conv) {
        const otherId = conv.mentee_id === user.id ? conv.mentor_id : conv.mentee_id;
        const { data: otherProfile } = await supabaseUntyped
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", otherId)
          .single();
        setSelectedConv({
          ...conv,
          other_user: otherProfile || { name: "User", avatar_url: null },
        });
      }
      setInitializing(false);
    };
    openConversation();
  }, [user, conversationIdParam, profile]);

  // Auto-create or open conversation from mentor param (mentee flow)
  useEffect(() => {
    if (!user || !mentorIdParam || !profile || initializing) return;
    if (profile.role !== "mentee") return;

    const initConversation = async () => {
      setInitializing(true);

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

  // Auto-create or open conversation from mentee param (mentor flow)
  useEffect(() => {
    if (!user || !menteeIdParam || !profile || initializing) return;
    if (profile.role !== "mentor") return;

    const initConversation = async () => {
      setInitializing(true);

      const { data: existing } = await supabaseUntyped
        .from("conversations")
        .select("*")
        .eq("mentor_id", user.id)
        .eq("mentee_id", menteeIdParam)
        .single();

      let convId: string;
      if (existing) {
        convId = existing.id;
      } else {
        const { data: created, error } = await supabaseUntyped
          .from("conversations")
          .insert({ mentee_id: menteeIdParam, mentor_id: user.id })
          .select()
          .single();
        if (error || !created) { setInitializing(false); return; }
        convId = created.id;
      }

      const { data: otherProfile } = await supabaseUntyped
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", menteeIdParam)
        .single();

      setSelectedConv({
        id: convId,
        mentee_id: menteeIdParam,
        mentor_id: user.id,
        other_user: otherProfile || { name: "Mentee", avatar_url: null },
      });
      setInitializing(false);
    };

    initConversation();
  }, [user, menteeIdParam, profile]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const otherUserId = selectedConv
    ? selectedConv.mentee_id === user?.id
      ? selectedConv.mentor_id
      : selectedConv.mentee_id
    : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      <Navbar />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Conversation list sidebar */}
        <div
          className={cn(
            "w-full md:w-80 border-r border-border bg-card flex flex-col shrink-0 min-h-0",
            selectedConv ? "hidden md:flex" : "flex"
          )}
        >
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h2 className="font-display font-semibold text-foreground">Messages</h2>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ConversationList
              selectedId={selectedConv?.id || null}
              onSelect={(conv) => setSelectedConv(conv)}
            />
          </div>
        </div>

        {/* Chat window */}
        <div className={cn("flex-1 flex flex-col min-h-0 min-w-0", !selectedConv ? "hidden md:flex" : "flex")}>
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
