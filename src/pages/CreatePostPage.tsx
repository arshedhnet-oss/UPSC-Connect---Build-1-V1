import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/community/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X, ImagePlus, FileUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const TAG_OPTIONS = ["GS1", "GS2", "GS3", "GS4", "Essay", "Ethics", "CSAT", "Optional", "Polity", "Economy", "History", "Geography", "Science", "Current Affairs", "Answer Writing", "Strategy"];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CreatePostPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const remaining = MAX_FILES - files.length;
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

    const newFiles = validFiles.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));

    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    setUploading(true);
    const urls: string[] = [];

    for (const { file } of files) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("post-attachments")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("post-attachments")
        .getPublicUrl(path);

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
      const imageUrls = await uploadFiles();

      const { data, error } = await supabase
        .from("posts" as any)
        .insert({
          title: title.trim(),
          content: content.trim(),
          author_id: user.id,
          tags: selectedTags,
          image_urls: imageUrls,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      toast({ title: "Post published!" });
      navigate(`/community/${(data as any).id}`);
    } catch (err: any) {
      toast({ title: "Failed to publish", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const isImage = (file: File) => file.type.startsWith("image/");

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

          {/* File upload section */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Attachments (optional, up to {MAX_FILES} files, max 5MB each)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {files.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {files.map((f, i) => (
                  <div key={i} className="relative rounded-lg border border-border overflow-hidden bg-muted/50 group">
                    {isImage(f.file) && f.preview ? (
                      <img src={f.preview} alt={f.file.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-28 px-2">
                        <FileUp className="h-6 w-6 text-muted-foreground mr-2 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{f.file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length < MAX_FILES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4 mr-2" /> Add Photos / Files
              </Button>
            )}
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
            <Button type="submit" disabled={submitting || uploading}>
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
              ) : submitting ? "Publishing…" : "Publish Post"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/community")}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostPage;
