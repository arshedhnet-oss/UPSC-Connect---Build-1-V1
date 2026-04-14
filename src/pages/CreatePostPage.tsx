import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X } from "lucide-react";
import { Link } from "react-router-dom";

const TAG_OPTIONS = ["GS1", "GS2", "GS3", "GS4", "Essay", "Ethics", "CSAT", "Optional", "Polity", "Economy", "History", "Geography", "Science", "Current Affairs", "Answer Writing", "Strategy"];

const CreatePostPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">You need to be logged in to create a post.</p>
          <Button asChild><Link to="/login">Log in</Link></Button>
        </div>
      </div>
    );
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({ title: "Please fill in title and content", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("posts" as any)
        .insert({ title: title.trim(), content: content.trim(), author_id: user.id, tags: selectedTags } as any)
        .select("id")
        .single();
      if (error) throw error;
      toast({ title: "Post published!" });
      navigate(`/community/${(data as any).id}`);
    } catch (err: any) {
      toast({ title: "Failed to publish", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/community"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Write a Post</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Input
              placeholder="Post title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              className="text-lg font-semibold"
            />
          </div>
          <div>
            <Textarea
              placeholder="Write your answer, notes, or essay here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              className="resize-y min-h-[200px] leading-relaxed"
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Tags (optional, up to 5)</p>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Publishing…" : "Publish Post"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/community")}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostPage;
