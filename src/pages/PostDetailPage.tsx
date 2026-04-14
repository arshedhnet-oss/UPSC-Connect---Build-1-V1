import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, Clock, Reply } from "lucide-react";

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ["community-post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts" as any)
        .select("*, profiles!posts_author_id_fkey(name, avatar_url)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["community-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments" as any)
        .select("*, profiles!comments_user_id_fkey(name, avatar_url)")
        .eq("post_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const payload: any = {
        post_id: id,
        user_id: user!.id,
        content: commentText.trim(),
      };
      if (replyTo) payload.parent_id = replyTo.id;
      const { error } = await supabase.from("comments" as any).insert(payload as any);
      if (error) throw error;
      setCommentText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["community-comments", id] });
      queryClient.invalidateQueries({ queryKey: ["community-post", id] });
    } catch (err: any) {
      toast({ title: "Failed to post comment", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Organize comments into threads
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

  if (postLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/3 mb-6" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Post not found.</p>
          <Button asChild className="mt-4"><Link to="/community">Back to Community</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/community"><ArrowLeft className="h-4 w-4 mr-1" /> Community</Link>
        </Button>

        {/* Post content */}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {(post.profiles?.name || "A").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{post.profiles?.name || "Anonymous"}</span>
          </div>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(post.created_at)}</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{post.comment_count || 0} comments</span>
        </div>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        <div className="prose prose-sm max-w-none text-card-foreground whitespace-pre-wrap leading-[1.8] text-[15px]">
          {post.content}
        </div>

        {/* Comments section */}
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

          {commentsLoading ? (
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
      </article>
    </div>
  );
};

export default PostDetailPage;
