import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import FeaturedMentorBadge from "@/components/FeaturedMentorBadge";
import AirRankLabel from "@/components/AirRankLabel";

interface MentorListing {
  user_id: string;
  bio: string | null;
  subjects: string[];
  price_per_session: number;
  languages: string[];
  optional_subject: string | null;
  is_featured: boolean;
  featured_tag: string | null;
  air_rank: number | null;
  rank_year: number | null;
  display_priority: number;
  average_rating: number | null;
  total_reviews: number | null;
  profile: { name: string; avatar_url: string | null };
}

const MentorListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const featuredOnly = searchParams.get("featured") === "true";
  const [mentors, setMentors] = useState<MentorListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mentorsWithSlots, setMentorsWithSlots] = useState<Set<string>>(new Set());

  // Filters
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedOptional, setSelectedOptional] = useState<string>("");

  useEffect(() => {
    const fetchMentors = async () => {
      let query = supabaseUntyped
        .from("mentor_profiles")
        .select("user_id, bio, subjects, price_per_session, languages, optional_subject, is_featured, featured_tag, air_rank, rank_year, display_priority")
        .eq("is_approved", true)
        .order("display_priority", { ascending: false });

      if (featuredOnly) {
        query = query.eq("is_featured", true);
      }

      const { data } = await query;

      if (data) {
        // Fetch public profile data from the secure view
        const userIds = data.map((m: any) => m.user_id);
        const { data: publicProfiles } = await supabaseUntyped
          .from("mentor_public_profiles_view")
          .select("id, name, avatar_url")
          .in("id", userIds);

        const profileMap = new Map((publicProfiles || []).map((p: any) => [p.id, p]));

        const mapped = data.map((m: any) => ({
          user_id: m.user_id,
          bio: m.bio,
          subjects: m.subjects || [],
          price_per_session: m.price_per_session,
          languages: m.languages || [],
          optional_subject: m.optional_subject,
          is_featured: m.is_featured || false,
          featured_tag: m.featured_tag,
          air_rank: m.air_rank,
          rank_year: m.rank_year,
          display_priority: m.display_priority || 0,
          profile: {
            name: profileMap.get(m.user_id)?.name || "Mentor",
            avatar_url: profileMap.get(m.user_id)?.avatar_url,
          },
        }));
        setMentors(mapped);
      }
      setLoading(false);
    };
    fetchMentors();
  }, [featuredOnly]);

  // Fetch free slots for the selected date
  useEffect(() => {
    if (!selectedDate) {
      setMentorsWithSlots(new Set());
      return;
    }
    const fetchSlots = async () => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data } = await supabaseUntyped
        .from("slots")
        .select("mentor_id")
        .eq("date", dateStr)
        .eq("is_booked", false);
      if (data) {
        setMentorsWithSlots(new Set(data.map((s: any) => s.mentor_id)));
      }
    };
    fetchSlots();
  }, [selectedDate]);

  // Collect unique languages and optional subjects for dropdowns
  const allLanguages = useMemo(() => {
    const set = new Set<string>();
    mentors.forEach(m => m.languages.forEach(l => set.add(l)));
    return Array.from(set).sort();
  }, [mentors]);

  const allOptionalSubjects = useMemo(() => {
    const set = new Set<string>();
    mentors.forEach(m => { if (m.optional_subject) set.add(m.optional_subject); });
    return Array.from(set).sort();
  }, [mentors]);

  // Filtered mentors
  const filtered = useMemo(() => {
    const result = mentors.filter(m => {
      if (selectedDate && !mentorsWithSlots.has(m.user_id)) return false;
      if (selectedLanguage && !m.languages.includes(selectedLanguage)) return false;
      if (selectedOptional && m.optional_subject !== selectedOptional) return false;
      return true;
    });
    // Sort by display_priority (descending), then featured status
    return result.sort((a, b) => {
      const priorityDiff = (b.display_priority || 0) - (a.display_priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });
  }, [mentors, selectedDate, mentorsWithSlots, selectedLanguage, selectedOptional]);

  const hasFilters = !!selectedDate || !!selectedLanguage || !!selectedOptional;

  const clearFilters = () => {
    setSelectedDate(undefined);
    setSelectedLanguage("");
    setSelectedOptional("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {featuredOnly ? "Our Recommended Mentors" : "Find a Mentor"}
        </h1>
        <p className="text-muted-foreground mb-4">
          {featuredOnly ? "Hand-picked mentors recommended by UPSC Connect for personalized guidance" : "Browse approved mentors and book a session"}
        </p>
        {featuredOnly && (
          <Button variant="outline" size="sm" className="mb-4" onClick={() => setSearchParams({})}>
            <X className="h-3.5 w-3.5 mr-1" /> Show all mentors
          </Button>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Date filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[200px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Free slots on date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().toDateString())}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Language filter */}
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {allLanguages.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Optional subject filter */}
          <Select value={selectedOptional} onValueChange={setSelectedOptional}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Optional Subject" />
            </SelectTrigger>
            <SelectContent>
              {allOptionalSubjects.map(subj => (
                <SelectItem key={subj} value={subj}>{subj}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading mentors...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {hasFilters ? "No mentors match your filters. Try adjusting them." : "No approved mentors yet. Check back soon!"}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map(m => (
              <Card
                key={m.user_id}
                className={cn(
                  "hover:shadow-md transition-shadow",
                  m.is_featured && "border-[#C9A646]/40 shadow-sm shadow-[#C9A646]/10"
                )}
              >
                <CardContent className="p-6">
                  {m.is_featured && m.featured_tag && (
                    <div className="mb-3">
                      <FeaturedMentorBadge featuredTag={m.featured_tag} />
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={m.profile.avatar_url || undefined} alt={m.profile.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-display">
                          {m.profile.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {m.air_rank && <AirRankLabel airRank={m.air_rank} rankYear={m.rank_year} variant="overlay" />}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-card-foreground">{m.profile.name}</h3>
                      <p className="text-sm text-muted-foreground">₹{m.price_per_session}/session</p>
                    </div>
                  </div>
                  {m.bio && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{m.bio}</p>}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {m.subjects.map(s => (<Badge key={s} variant="secondary" className="text-xs">{s}</Badge>))}
                  </div>
                  {m.languages.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-2">Languages: {m.languages.join(", ")}</p>
                  )}
                  {m.optional_subject && (
                    <p className="text-xs text-muted-foreground mb-3">Optional: {m.optional_subject}</p>
                  )}
                  <Button asChild className="w-full"><Link to={`/mentors/${m.user_id}`}>View Profile</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorListingPage;
