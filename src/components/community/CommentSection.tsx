import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Reply } from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface CommentSectionProps {
  postId: string;
  user: User | null;
}

const CommentSection = ({ postId, user }: CommentSectionProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["community-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments" as any)
        .select("*, profiles!comments_user_id_fkey(name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const payload: any = { post_id: postId, user_id: user!.id, content: commentText.trim() };
      if (replyTo) payload.parent_id = replyTo.id;
      const { error } = await supabase.from("comments" as any).insert(payload as any);
      if (error) throw error;
      setCommentText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["community-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
    } catch (err: any) {
      toast({ title: "Failed to post comment", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const topLevel = comments.filter((c: any) => !c.parent_id);
  const replies = comments.filter((c: any) => c.parent_id);
  const getReplies = (parentId: string) => replies.filter((r: any) => r.parent_id === parentId);

  const CommentItem = ({ comment, isReply = false }: { comment: any; isReply?: boolean }) => (
    <div className={`${isReply ? "ml-8 border-l-2 border-border pl-4" : ""} py-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Avatar className="h-6 w-6">
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {(comment.profiles?.name || "A").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground">{comment.profiles?.name || "Anonymous"}</span>
        <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)} · {formatTime(comment.created_at)}</span>
      </div>
      <p className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed">{comment.content}</p>
      {user && !isReply && (
        <button
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setReplyTo({ id: comment.id, name: comment.profiles?.name || "Anonymous" })}
        >
          <Reply className="h-3 w-3" /> Reply
        </button>
      )}
    </div>
  );

  return (
    <div className="mt-10 border-t border-border pt-6">
      <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" /> Discussion ({comments.length})
      </h2>

      {user ? (
        <form onSubmit={handleComment} className="mb-6">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span>Replying to <span className="font-medium text-foreground">{replyTo.name}</span></span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-destructive hover:underline">Cancel</button>
            </div>
          )}
          <Textarea
            placeholder="Share your thoughts…"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            rows={3}
            className="resize-none mb-2"
          />
          <Button type="submit" size="sm" disabled={submitting || !commentText.trim()}>
            {submitting ? "Posting…" : "Post Comment"}
          </Button>
        </form>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-center mb-6">
          <p className="text-sm text-muted-foreground mb-2">Login to join the discussion</p>
          <Button size="sm" asChild><Link to="/login">Log in</Link></Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Start the discussion!</p>
      ) : (
        <div className="divide-y divide-border">
          {topLevel.map((comment: any) => (
            <div key={comment.id}>
              <CommentItem comment={comment} />
              {getReplies(comment.id).map((reply: any) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
