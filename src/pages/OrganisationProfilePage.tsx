import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Globe, Mail, Phone, Users } from "lucide-react";
import Navbar from "@/components/Navbar";

interface OrgMentor {
  user_id: string;
  bio: string | null;
  subjects: string[];
  price_per_session: number;
  languages: string[];
  optional_subject: string | null;
  average_rating: number;
  total_reviews: number;
  profile: { name: string; avatar_url: string | null };
}

const OrganisationProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<any>(null);
  const [mentors, setMentors] = useState<OrgMentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: orgData } = await supabaseUntyped
        .from("organisations")
        .select("*")
        .eq("slug", slug!)
        .single();

      if (!orgData) { setLoading(false); return; }
      setOrg(orgData);

      // Fetch approved mentors for this org
      const { data: orgMentors } = await supabaseUntyped
        .from("organisation_mentors")
        .select("mentor_id")
        .eq("organisation_id", orgData.id)
        .eq("status", "approved");

      if (orgMentors && orgMentors.length > 0) {
        const mentorIds = orgMentors.map((m: any) => m.mentor_id);
        const { data: mentorProfiles } = await supabaseUntyped
          .from("mentor_profiles")
          .select("user_id, bio, subjects, price_per_session, languages, optional_subject, average_rating, total_reviews, profiles!mentor_profiles_user_id_fkey(name, avatar_url)")
          .in("user_id", mentorIds)
          .eq("is_approved", true);

        if (mentorProfiles) {
          setMentors(mentorProfiles.map((m: any) => ({
            user_id: m.user_id,
            bio: m.bio,
            subjects: m.subjects || [],
            price_per_session: m.price_per_session,
            languages: m.languages || [],
            optional_subject: m.optional_subject,
            average_rating: m.average_rating || 0,
            total_reviews: m.total_reviews || 0,
            profile: { name: m.profiles?.name || "Mentor", avatar_url: m.profiles?.avatar_url },
          })));
        }
      }
      setLoading(false);
    };
    if (slug) fetchOrg();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!org) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Organisation not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Org Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 text-center sm:text-left">
          <Avatar className="h-20 w-20 rounded-xl">
            <AvatarImage src={org.logo_url || undefined} alt={org.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-display text-2xl rounded-xl">
              {org.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{org.name}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-2 text-sm text-muted-foreground">
              {org.location && (
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {org.location}</span>
              )}
              {org.website && (
                <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
              {org.contact_email && (
                <a href={`mailto:${org.contact_email}`} className="flex items-center gap-1 hover:text-foreground">
                  <Mail className="h-4 w-4" /> {org.contact_email}
                </a>
              )}
              {org.contact_phone && (
                <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {org.contact_phone}</span>
              )}
            </div>
          </div>
        </div>

        {org.description && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="font-display">About</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">{org.description}</p></CardContent>
          </Card>
        )}

        {/* Mentors List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5" /> Our Mentors
              <Badge variant="secondary" className="ml-2">{mentors.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mentors.length === 0 ? (
              <p className="text-muted-foreground">No mentors listed yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {mentors.map(m => (
                  <div key={m.user_id} className="rounded-lg border border-border p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={m.profile.avatar_url || undefined} alt={m.profile.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-display">
                          {m.profile.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{m.profile.name}</h3>
                        <p className="text-sm text-muted-foreground">₹{m.price_per_session}/session</p>
                      </div>
                    </div>
                    {m.bio && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{m.bio}</p>}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {m.subjects.slice(0, 3).map(s => (<Badge key={s} variant="secondary" className="text-xs">{s}</Badge>))}
                    </div>
                    <Button asChild size="sm" className="w-full">
                      <Link to={`/mentors/${m.user_id}`}>View Profile</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganisationProfilePage;
