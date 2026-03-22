import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import { Search, X } from "lucide-react";

interface MentorListing {
  user_id: string;
  bio: string | null;
  subjects: string[];
  price_per_session: number;
  languages: string[];
  optional_subject: string | null;
  profile: { name: string; avatar_url: string | null };
}

const MentorListingPage = () => {
  const [mentors, setMentors] = useState<MentorListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [optionalSubjectFilter, setOptionalSubjectFilter] = useState<string>("all");

  useEffect(() => {
    const fetchMentors = async () => {
      const { data } = await supabaseUntyped
        .from("mentor_profiles")
        .select("user_id, bio, subjects, price_per_session, languages, optional_subject, profiles!mentor_profiles_user_id_fkey(name, avatar_url)")
        .eq("is_approved", true);

      if (data) {
        const mapped = data.map((m: any) => ({
          user_id: m.user_id,
          bio: m.bio,
          subjects: m.subjects || [],
          price_per_session: m.price_per_session,
          languages: m.languages || [],
          optional_subject: m.optional_subject,
          profile: { name: m.profiles?.name || "Mentor", avatar_url: m.profiles?.avatar_url },
        }));
        setMentors(mapped);
      }
      setLoading(false);
    };
    fetchMentors();
  }, []);

  // Derive unique filter options from data
  const allLanguages = useMemo(() => {
    const set = new Set<string>();
    mentors.forEach(m => m.languages.forEach(l => set.add(l)));
    return Array.from(set).sort();
  }, [mentors]);

  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    mentors.forEach(m => m.subjects.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [mentors]);

  const allOptionalSubjects = useMemo(() => {
    const set = new Set<string>();
    mentors.forEach(m => { if (m.optional_subject) set.add(m.optional_subject); });
    return Array.from(set).sort();
  }, [mentors]);

  // Filtered mentors
  const filtered = useMemo(() => {
    return mentors.filter(m => {
      const q = searchQuery.toLowerCase().trim();
      if (q && !m.profile.name.toLowerCase().includes(q) && !(m.bio || "").toLowerCase().includes(q)) {
        return false;
      }
      if (languageFilter !== "all" && !m.languages.includes(languageFilter)) return false;
      if (subjectFilter !== "all" && !m.subjects.includes(subjectFilter)) return false;
      if (optionalSubjectFilter !== "all" && m.optional_subject !== optionalSubjectFilter) return false;
      return true;
    });
  }, [mentors, searchQuery, languageFilter, subjectFilter, optionalSubjectFilter]);

  const hasActiveFilters = searchQuery || languageFilter !== "all" || subjectFilter !== "all" || optionalSubjectFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setLanguageFilter("all");
    setSubjectFilter("all");
    setOptionalSubjectFilter("all");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Find a Mentor</h1>
        <p className="text-muted-foreground mb-6 sm:mb-8">Browse approved mentors and book a session</p>

        {/* Search & Filters */}
        {!loading && mentors.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or bio..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {allLanguages.length > 0 && (
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {allLanguages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {allSubjects.length > 0 && (
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {allSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {allOptionalSubjects.length > 0 && (
                <Select value={optionalSubjectFilter} onValueChange={setOptionalSubjectFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Optional Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Optional Subjects</SelectItem>
                    {allOptionalSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading mentors...</div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No approved mentors yet. Check back soon!</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No mentors match your filters. Try adjusting your search.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map(m => (
              <Card key={m.user_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={m.profile.avatar_url || undefined} alt={m.profile.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-display">
                        {m.profile.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
                    <p className="text-xs text-muted-foreground mb-2">🗣 {m.languages.join(", ")}</p>
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
