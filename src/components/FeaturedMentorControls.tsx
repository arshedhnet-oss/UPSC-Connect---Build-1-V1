import { useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Star, Save } from "lucide-react";

interface FeaturedMentorControlsProps {
  mentor: any;
  onUpdate: (userId: string, updates: any) => void;
}

const FEATURED_TAGS = [
  "UPSC Rank Holder",
  "Serving Officer",
  "Verified Mentor",
];

const FeaturedMentorControls = ({ mentor, onUpdate }: FeaturedMentorControlsProps) => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [isFeatured, setIsFeatured] = useState(mentor.is_featured || false);
  const [featuredTag, setFeaturedTag] = useState(mentor.featured_tag || "");
  const [airRank, setAirRank] = useState<string>(mentor.air_rank?.toString() || "");
  const [rankYear, setRankYear] = useState<string>(mentor.rank_year?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleToggleFeatured = async () => {
    const newVal = !isFeatured;
    setIsFeatured(newVal);
    if (!newVal) {
      // Unfeaturing — save immediately
      setSaving(true);
      const { error } = await supabaseUntyped
        .from("mentor_profiles")
        .update({ is_featured: false, featured_tag: null, air_rank: null, rank_year: null, display_priority: 0 })
        .eq("user_id", mentor.user_id);
      setSaving(false);
      if (error) {
        toast({ title: "Failed to update", variant: "destructive" });
        setIsFeatured(true);
      } else {
        setFeaturedTag("");
        setAirRank("");
        setRankYear("");
        setExpanded(false);
        onUpdate(mentor.user_id, { is_featured: false, featured_tag: null, air_rank: null, rank_year: null, display_priority: 0 });
        toast({ title: "Mentor unfeatured" });
      }
    } else {
      setExpanded(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const currentPriority = mentor.display_priority || 0;
    const updates: any = {
      is_featured: isFeatured,
      featured_tag: featuredTag || null,
      air_rank: airRank ? parseInt(airRank) : null,
      rank_year: rankYear ? parseInt(rankYear) : null,
      display_priority: isFeatured && currentPriority === 0 ? 100 : currentPriority,
    };
    const { error } = await supabaseUntyped
      .from("mentor_profiles")
      .update(updates)
      .eq("user_id", mentor.user_id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      onUpdate(mentor.user_id, updates);
      setExpanded(false);
      toast({ title: "Featured mentor details saved" });
    }
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant={isFeatured ? "default" : "outline"}
        onClick={handleToggleFeatured}
        disabled={saving}
      >
        <Star className={`h-4 w-4 mr-1 ${isFeatured ? "fill-current" : ""}`} />
        {isFeatured ? "Featured" : "Feature"}
      </Button>

      {isFeatured && expanded && (
        <div className="mt-2 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <Select value={featuredTag} onValueChange={setFeaturedTag}>
            <SelectTrigger className="w-full text-xs h-8">
              <SelectValue placeholder="Select tag..." />
            </SelectTrigger>
            <SelectContent>
              {FEATURED_TAGS.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="AIR Rank"
              value={airRank}
              onChange={e => setAirRank(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="number"
              placeholder="Year"
              value={rankYear}
              onChange={e => setRankYear(e.target.value)}
              className="h-8 text-xs w-24"
            />
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving} className="w-full h-8 text-xs">
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Save Details"}
          </Button>
        </div>
      )}

      {isFeatured && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Edit featured details
        </button>
      )}
    </div>
  );
};

export default FeaturedMentorControls;
