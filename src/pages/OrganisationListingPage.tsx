import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Users } from "lucide-react";
import Navbar from "@/components/Navbar";

interface OrgListing {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  location: string | null;
  website: string | null;
  mentor_count: number;
}

const OrganisationListingPage = () => {
  const [orgs, setOrgs] = useState<OrgListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabaseUntyped
        .from("organisations")
        .select("id, name, slug, description, logo_url, location, website")
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .order("name");

      if (data) {
        // Get mentor counts for each org
        const orgIds = data.map((o: any) => o.id);
        const { data: mentorCounts } = await supabaseUntyped
          .from("organisation_mentors")
          .select("organisation_id")
          .eq("status", "approved")
          .in("organisation_id", orgIds);

        const countMap: Record<string, number> = {};
        (mentorCounts || []).forEach((m: any) => {
          countMap[m.organisation_id] = (countMap[m.organisation_id] || 0) + 1;
        });

        setOrgs(data.map((o: any) => ({
          ...o,
          mentor_count: countMap[o.id] || 0,
        })));
      }
      setLoading(false);
    };
    fetchOrgs();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Organisations</h1>
        <p className="text-muted-foreground mb-6 sm:mb-8">Browse coaching institutes and educational organisations</p>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading organisations...</div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No organisations yet. Check back soon!</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {orgs.map(org => (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-14 w-14 rounded-lg">
                      <AvatarImage src={org.logo_url || undefined} alt={org.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-display rounded-lg text-lg">
                        {org.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-card-foreground truncate">{org.name}</h3>
                      {org.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {org.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {org.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{org.description}</p>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" /> {org.mentor_count} Mentor{org.mentor_count !== 1 ? "s" : ""}
                    </Badge>
                    {org.website && (
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                        <Globe className="h-3 w-3" /> Website
                      </a>
                    )}
                  </div>
                  <Button asChild className="w-full">
                    <Link to={`/organisations/${org.slug}`}>View Organisation</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganisationListingPage;
