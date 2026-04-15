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
import { ArrowLeft, MessageSquare, Clock, Reply, FileDown } from "lucide-react";
import PostImageGallery from "@/components/community/PostImageGallery";
import CommentSection from "@/components/community/CommentSection";

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

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

  const imageUrls = (post.image_urls || []) as string[];
  const images = imageUrls.filter((url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url));
  const otherFiles = imageUrls.filter((url: string) => !/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/community"><ArrowLeft className="h-4 w-4 mr-1" /> Community</Link>
        </Button>

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

        {/* Image gallery */}
        {images.length > 0 && <PostImageGallery images={images} />}

        {/* Other file attachments */}
        {otherFiles.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Attachments</p>
            {otherFiles.map((url: string, i: number) => {
              const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] || `File ${i + 1}`);
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/50 transition-colors"
                >
                  <FileDown className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate text-foreground">{name}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Comments */}
        <CommentSection postId={id!} user={user} />
      </article>
    </div>
  );
};

export default PostDetailPage;
