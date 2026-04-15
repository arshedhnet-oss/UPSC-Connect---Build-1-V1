import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/community/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X, ImagePlus, FileUp, Loader2 } from "lucide-react";

const TAG_OPTIONS = ["GS1", "GS2", "GS3", "GS4", "Essay", "Ethics", "CSAT", "Optional", "Polity", "Economy", "History", "Geography", "Science", "Current Affairs", "Answer Writing", "Strategy"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EditPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ["edit-post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (post && !initialized) {
      setTitle(post.title);
      setContent(post.content);
      setSelectedTags(post.tags || []);
      setExistingUrls(post.image_urls || []);
      setInitialized(true);
    }
  }, [post, initialized]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">You need to be logged in.</p>
          <Button asChild><Link to="/login">Log in</Link></Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (post && post.author_id !== user.id) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">You can only edit your own posts.</p>
          <Button asChild><Link to={`/community/${id}`}>Back to Post</Link></Button>
        </div>
      </div>
    );
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const totalFiles = existingUrls.length + newFiles.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const remaining = MAX_FILES - totalFiles;
    if (remaining <= 0) {
      toast({ title: `Maximum ${MAX_FILES} files allowed`, variant: "destructive" });
      return;
    }
    const validFiles = selectedFiles.slice(0, remaining).filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `${f.name} exceeds 5MB limit`, variant: "destructive" });
        return false;
      }
      return true;
    });
    const mapped = validFiles.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    setNewFiles(prev => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeExistingUrl = (index: number) => {
    setExistingUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadNewFiles = async (): Promise<string[]> => {
    if (newFiles.length === 0) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const { file } of newFiles) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("post-attachments")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("post-attachments").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    setUploading(false);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({ title: "Please fill in title and content", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const uploadedUrls = await uploadNewFiles();
      const allUrls = [...existingUrls, ...uploadedUrls];

      const { error } = await supabase
        .from("posts")
        .update({
          title: title.trim(),
          content: content.trim(),
          tags: selectedTags,
          image_urls: allUrls,
        })
        .eq("id", id!);
      if (error) throw error;
      toast({ title: "Post updated!" });
      navigate(`/community/${id}`);
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={`/community/${id}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Edit Post</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            placeholder="Post title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            className="text-lg font-semibold"
          />
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write your answer, notes, or essay here..."
          />

          <div>
            <p className="text-sm text-muted-foreground mb-2">Attachments (up to {MAX_FILES} files, max 5MB each)</p>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" multiple className="hidden" onChange={handleFileSelect} />

            {(existingUrls.length > 0 || newFiles.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {existingUrls.map((url, i) => (
                  <div key={`existing-${i}`} className="relative rounded-lg border border-border overflow-hidden bg-muted/50">
                    {isImage(url) ? (
                      <img src={url} alt="" className="w-full h-28 object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-28 px-2">
                        <FileUp className="h-6 w-6 text-muted-foreground mr-2 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{decodeURIComponent(url.split("/").pop()?.split("?")[0] || "File")}</span>
                      </div>
                    )}
                    <button type="button" onClick={() => removeExistingUrl(i)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-80 hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {newFiles.map((f, i) => (
                  <div key={`new-${i}`} className="relative rounded-lg border border-border overflow-hidden bg-muted/50">
                    {f.file.type.startsWith("image/") && f.preview ? (
                      <img src={f.preview} alt={f.file.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-28 px-2">
                        <FileUp className="h-6 w-6 text-muted-foreground mr-2 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{f.file.name}</span>
                      </div>
                    )}
                    <button type="button" onClick={() => removeNewFile(i)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-80 hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalFiles < MAX_FILES && (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-2" /> Add Photos / Files
              </Button>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Tags (optional, up to 5)</p>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(tag => (
                <Badge key={tag} variant={selectedTags.includes(tag) ? "default" : "outline"} className="cursor-pointer select-none" onClick={() => toggleTag(tag)}>
                  {tag}{selectedTags.includes(tag) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting || uploading}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : submitting ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/community/${id}`)}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostPage;
