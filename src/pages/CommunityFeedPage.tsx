import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PenLine, MessageSquare, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

const CommunityFeedPage = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["community-posts", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("posts" as any)
        .select("id, title, content, tags, comment_count, created_at, author_id, profiles!posts_author_id_fkey(name, avatar_url)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { posts: data as any[], total: count || 0 };
    },
  });

  const posts = data?.posts || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const getPreview = (content: string) => {
    const plain = content.replace(/[#*_~`>\-\[\]()]/g, "").trim();
    return plain.length > 180 ? plain.slice(0, 180) + "…" : plain;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Community</h1>
            <p className="text-sm text-muted-foreground mt-1">Share writeups, discuss answers, learn together</p>
          </div>
          {user && (
            <Button asChild>
              <Link to="/community/new"><PenLine className="h-4 w-4 mr-2" /> Write</Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No writeups yet. Be the first to share!</p>
            {user && (
              <Button asChild>
                <Link to="/community/new"><PenLine className="h-4 w-4 mr-2" /> Write a Post</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post: any) => (
                <Link
                  key={post.id}
                  to={`/community/${post.id}`}
                  className="block rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <h2 className="font-display text-lg font-semibold text-card-foreground mb-1 line-clamp-2">{post.title}</h2>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{getPreview(post.content)}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{post.profiles?.name || "Anonymous"}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(post.created_at)}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.comment_count || 0}</span>
                    {post.tags?.length > 0 && post.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile FAB */}
      {user && (
        <Link
          to="/community/new"
          className="fixed bottom-6 right-6 sm:hidden flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <PenLine className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
};

export default CommunityFeedPage;
