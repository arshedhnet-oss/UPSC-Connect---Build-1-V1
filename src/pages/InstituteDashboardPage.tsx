import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Users, Building2, Pencil, UserPlus, Clock, Upload } from "lucide-react";
import Navbar from "@/components/Navbar";

const InstituteDashboardPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [org, setOrg] = useState<any>(null);
  const [orgMentors, setOrgMentors] = useState<any[]>([]);
  const [pendingMentors, setPendingMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [uploading, setUploading] = useState(false);

  // Add mentor by email
  const [mentorEmail, setMentorEmail] = useState("");
  const [addingMentor, setAddingMentor] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchOrg = async () => {
      const { data } = await supabaseUntyped
        .from("organisations")
        .select("*")
        .eq("created_by", user.id)
        .single();

      if (!data) {
        navigate("/organisations/register");
        return;
      }
      setOrg(data);
      setEditName(data.name);
      setEditDescription(data.description || "");
      setEditLocation(data.location || "");
      setEditContactEmail(data.contact_email || "");
      setEditContactPhone(data.contact_phone || "");
      setEditWebsite(data.website || "");

      // Fetch mentors
      const { data: mentors } = await supabaseUntyped
        .from("organisation_mentors")
        .select("*, profiles!organisation_mentors_mentor_id_fkey(name, email, avatar_url)")
        .eq("organisation_id", data.id);

      if (mentors) {
        setOrgMentors(mentors.filter((m: any) => m.status === "approved"));
        setPendingMentors(mentors.filter((m: any) => m.status === "pending"));
      }
      setLoading(false);
    };
    fetchOrg();
  }, [user]);

  const handleUpdateOrg = async () => {
    if (!org) return;
    const { error } = await supabaseUntyped
      .from("organisations")
      .update({
        name: editName,
        description: editDescription || null,
        location: editLocation || null,
        contact_email: editContactEmail || null,
        contact_phone: editContactPhone || null,
        website: editWebsite || null,
      })
      .eq("id", org.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else {
      setOrg({ ...org, name: editName, description: editDescription, location: editLocation, contact_email: editContactEmail, contact_phone: editContactPhone, website: editWebsite });
      setEditing(false);
      toast({ title: "Organisation updated!" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${org.id}/logo.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
    if (uploadErr) { toast({ title: "Upload failed", variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
    const logoUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabaseUntyped.from("organisations").update({ logo_url: logoUrl }).eq("id", org.id);
    setOrg({ ...org, logo_url: logoUrl });
    setUploading(false);
    toast({ title: "Logo updated!" });
  };

  const approveMentor = async (id: string) => {
    const { error } = await supabaseUntyped
      .from("organisation_mentors")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else {
      const mentor = pendingMentors.find(m => m.id === id);
      setPendingMentors(prev => prev.filter(m => m.id !== id));
      if (mentor) setOrgMentors(prev => [...prev, { ...mentor, status: "approved" }]);
      toast({ title: "Mentor approved!" });
    }
  };

  const rejectMentor = async (id: string) => {
    const { error } = await supabaseUntyped
      .from("organisation_mentors")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else {
      setPendingMentors(prev => prev.filter(m => m.id !== id));
      toast({ title: "Mentor rejected" });
    }
  };

  const removeMentor = async (id: string) => {
    const { error } = await supabaseUntyped
      .from("organisation_mentors")
      .delete()
      .eq("id", id);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else {
      setOrgMentors(prev => prev.filter(m => m.id !== id));
      toast({ title: "Mentor removed" });
    }
  };

  const addMentorByEmail = async () => {
    if (!mentorEmail || !org) return;
    setAddingMentor(true);
    // Find mentor profile by email
    const { data: mentorProfile } = await supabaseUntyped
      .from("profiles")
      .select("id, role")
      .eq("email", mentorEmail)
      .eq("role", "mentor")
      .single();

    if (!mentorProfile) {
      toast({ title: "Mentor not found", description: "No registered mentor with this email.", variant: "destructive" });
      setAddingMentor(false);
      return;
    }

    const { error } = await supabaseUntyped
      .from("organisation_mentors")
      .insert({ organisation_id: org.id, mentor_id: mentorProfile.id, status: "approved" });

    if (error) {
      toast({ title: "Failed", description: error.code === "23505" ? "Mentor already added" : error.message, variant: "destructive" });
    } else {
      const { data: fullProfile } = await supabaseUntyped
        .from("profiles")
        .select("name, email, avatar_url")
        .eq("id", mentorProfile.id)
        .single();
      setOrgMentors(prev => [...prev, { id: crypto.randomUUID(), organisation_id: org.id, mentor_id: mentorProfile.id, status: "approved", profiles: fullProfile }]);
      setMentorEmail("");
      toast({ title: "Mentor added!" });
    }
    setAddingMentor(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!org) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Institute Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              {!org.is_approved && <Badge variant="outline" className="text-accent border-accent">Pending Approval</Badge>}
              {org.is_suspended && <Badge variant="destructive">Suspended</Badge>}
              {org.is_approved && !org.is_suspended && <Badge className="bg-success text-success-foreground">Active</Badge>}
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/organisations/${org.slug}`}>View Public Page</Link>
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="profile" className="text-xs sm:text-sm"><Building2 className="h-4 w-4 mr-1" /> Profile</TabsTrigger>
            <TabsTrigger value="mentors" className="text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1" /> Mentors
              {pendingMentors.length > 0 && <span className="ml-1 rounded-full bg-accent/20 text-accent px-1.5 py-0.5 text-xs">{pendingMentors.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display">Organisation Profile</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                  <Pencil className="h-4 w-4 mr-1" /> {editing ? "Cancel" : "Edit"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 rounded-xl">
                    <AvatarImage src={org.logo_url || undefined} alt={org.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-display text-xl rounded-xl">
                      {org.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild disabled={uploading}>
                        <span><Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Change Logo"}</span>
                      </Button>
                    </Label>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>

                {editing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Location</Label><Input value={editLocation} onChange={e => setEditLocation(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Website</Label><Input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Contact Email</Label><Input value={editContactEmail} onChange={e => setEditContactEmail(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Contact Phone</Label><Input value={editContactPhone} onChange={e => setEditContactPhone(e.target.value)} /></div>
                    </div>
                    <Button onClick={handleUpdateOrg}>Save Changes</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-semibold text-foreground">{org.name}</h3>
                    {org.description && <p className="text-sm text-muted-foreground">{org.description}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {org.location && <span>📍 {org.location}</span>}
                      {org.contact_email && <span>✉️ {org.contact_email}</span>}
                      {org.contact_phone && <span>📞 {org.contact_phone}</span>}
                      {org.website && <a href={org.website} className="text-primary hover:underline">🌐 {org.website}</a>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mentors">
            <div className="space-y-4">
              {/* Add Mentor */}
              <Card>
                <CardHeader><CardTitle className="font-display text-base"><UserPlus className="h-4 w-4 inline mr-2" />Add Mentor</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Input placeholder="Mentor's registered email" value={mentorEmail} onChange={e => setMentorEmail(e.target.value)} className="flex-1" />
                    <Button onClick={addMentorByEmail} disabled={addingMentor || !mentorEmail}>
                      {addingMentor ? "Adding..." : "Add"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">The mentor must already be registered on the platform as a Mentor.</p>
                </CardContent>
              </Card>

              {/* Pending Requests */}
              {pendingMentors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Pending Requests
                      <Badge variant="outline">{pendingMentors.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingMentors.map(m => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{m.profiles?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.profiles?.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => approveMentor(m.id)}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => rejectMentor(m.id)}><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Active Mentors */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> Active Mentors
                    <Badge variant="secondary">{orgMentors.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orgMentors.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No mentors yet. Add mentors by email or wait for join requests.</p>
                  ) : (
                    <div className="space-y-3">
                      {orgMentors.map(m => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">{m.profiles?.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">{m.profiles?.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMentor(m.id)}>Remove</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InstituteDashboardPage;
