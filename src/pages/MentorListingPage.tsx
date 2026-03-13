import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface MentorListing {
  user_id: string;
  bio: string | null;
  subjects: string[];
  price_per_session: number;
  profile: { name: string; avatar_url: string | null };
}

const MentorListingPage = () => {
  const [mentors, setMentors] = useState<MentorListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMentors = async () => {
      const { data } = await supabaseUntyped
        .from("mentor_profiles")
        .select("user_id, bio, subjects, price_per_session, profiles!mentor_profiles_user_id_fkey(name, avatar_url)")
        .eq("is_approved", true);

      if (data) {
        const mapped = data.map((m: any) => ({
          user_id: m.user_id,
          bio: m.bio,
          subjects: m.subjects || [],
          price_per_session: m.price_per_session,
          profile: { name: m.profiles?.name || "Mentor", avatar_url: m.profiles?.avatar_url },
        }));
        setMentors(mapped);
      }
      setLoading(false);
    };
    fetchMentors();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-6xl mx-auto border-b border-border">
        <Link to="/" className="font-display text-lg sm:text-xl font-bold text-foreground">UPSC Connect</Link>
        <div className="flex gap-2 sm:gap-3">
          {user ? (
            <Button variant="ghost" size="sm" asChild><Link to="/dashboard">Dashboard</Link></Button>
          ) : (
            <Button size="sm" asChild><Link to="/login">Log in</Link></Button>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Find a Mentor</h1>
        <p className="text-muted-foreground mb-6 sm:mb-8">Browse approved mentors and book a session</p>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading mentors...</div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No approved mentors yet. Check back soon!</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map(m => (
              <Card key={m.user_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-12 w-12">
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
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {m.subjects.map(s => (<Badge key={s} variant="secondary" className="text-xs">{s}</Badge>))}
                  </div>
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
