import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import ChatWindow from "@/components/chat/ChatWindow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Loader2, X } from "lucide-react";

interface FreeChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WELCOME_MESSAGE = "Hi! Tell me where you're stuck in your UPSC preparation.";

export default function FreeChatModal({ open, onOpenChange }: FreeChatModalProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [convId, setConvId] = useState<string | null>(null);
  const [mentorProfile, setMentorProfile] = useState<{ id: string; name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll when open — avoid position:fixed which breaks iOS keyboard
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setConvId(null);
      setMentorProfile(null);
      setError(null);
      return;
    }

    if (authLoading) return;

    if (!user) {
      onOpenChange(false);
      navigate("/login");
      return;
    }

    initChat();
  }, [open, user, authLoading]);

  const initChat = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: featuredMentors, error: fmErr } = await supabaseUntyped
        .from("mentor_profiles")
        .select("user_id, profiles(id, name, avatar_url)")
        .eq("is_featured", true)
        .eq("is_approved", true)
        .limit(1)
        .single();

      if (fmErr || !featuredMentors) {
        setError("No featured mentor available right now. Please try again later.");
        setLoading(false);
        return;
      }

      const mentorId = featuredMentors.user_id;
      const mp = featuredMentors.profiles as any;
      setMentorProfile({ id: mentorId, name: mp?.name || "Mentor", avatar_url: mp?.avatar_url || null });

      const { data: existing } = await supabaseUntyped
        .from("conversations")
        .select("id")
        .eq("mentee_id", user.id)
        .eq("mentor_id", mentorId)
        .single();

      let chatConvId: string;

      if (existing) {
        chatConvId = existing.id;
      } else {
        const { data: created, error: createErr } = await supabaseUntyped
          .from("conversations")
          .insert({ mentee_id: user.id, mentor_id: mentorId })
          .select("id")
          .single();

        if (createErr || !created) {
          setError("Could not start chat. Please try again.");
          setLoading(false);
          return;
        }
        chatConvId = created.id;

        await supabaseUntyped.from("messages").insert({
          conversation_id: chatConvId,
          sender_id: mentorId,
          receiver_id: user.id,
          message_text: WELCOME_MESSAGE,
        });
      }

      setConvId(chatConvId);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const chatHeader = mentorProfile ? (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-foreground">{mentorProfile.name}</span>
      <Badge variant="secondary" className="gap-1 text-xs">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        Featured Mentor
      </Badge>
    </div>
  ) : (
    <span className="font-semibold text-foreground">UPSC Connect Chat</span>
  );

  const content = loading ? (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">Connecting you to a mentor...</p>
    </div>
  ) : error ? (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground px-4 text-center">
      <p>{error}</p>
    </div>
  ) : convId && mentorProfile ? (
    <ChatWindow
      conversationId={convId}
      otherUser={{ name: mentorProfile.name, avatar_url: mentorProfile.avatar_url }}
      otherUserId={mentorProfile.id}
      onBack={() => onOpenChange(false)}
      hideHeader
    />
  ) : null;

  // Full-screen mobile view
  if (isMobile) {
    if (!open) return null;
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col bg-background"
        style={{
          height: "100dvh",
          minHeight: "100vh",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          overscrollBehavior: "contain",
          touchAction: "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="min-w-0 flex-1">{chatHeader}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="shrink-0 h-11 w-11"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {/* Chat body */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {content}
        </div>
      </div>
    );
  }

  // Desktop dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden h-[70vh] flex flex-col">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle asChild>{chatHeader}</DialogTitle>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
