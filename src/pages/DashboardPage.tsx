import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import MentorProfileForm from "@/components/MentorProfileForm";
import DeleteMentorAccount from "@/components/DeleteMentorAccount";
import Navbar from "@/components/Navbar";
import MentorProfileForm from "@/components/MentorProfileForm";
import DeleteMentorAccount from "@/components/DeleteMentorAccount";

const DashboardPage = () => {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<any[]>([]);
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !profile) return;
    setAvatarUrl(profile.avatar_url);
    const fetchData = async () => {
      const { data: bk } = await supabaseUntyped
        .from("bookings")
        .select("*, slots(*), mentor:profiles!bookings_mentor_id_fkey(name, email), mentee:profiles!bookings_mentee_id_fkey(name, email)")
        .or(`mentee_id.eq.${user.id},mentor_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (bk) setBookings(bk);

      if (profile.role === "mentor") {
        const { data: mp } = await supabaseUntyped
          .from("mentor_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (mp) setMentorProfile(mp);

        const { data: sl } = await supabaseUntyped
          .from("slots")
          .select("*")
          .eq("mentor_id", user.id)
          .order("date", { ascending: true });
        if (sl) setSlots(sl);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, profile]);

  const addSlot = async () => {
    if (!slotDate || !slotStart || !slotEnd) return;
    const { data, error } = await supabaseUntyped
      .from("slots")
      .insert({ mentor_id: user!.id, date: slotDate, start_time: slotStart, end_time: slotEnd })
      .select()
      .single();
    if (error) toast({ title: "Failed to add slot", description: error.message, variant: "destructive" });
    else if (data) {
      setSlots(prev => [...prev, data]);
      setSlotDate(""); setSlotStart(""); setSlotEnd("");
      toast({ title: "Slot added!" });
    }
  };

  const deleteSlot = async (slotId: string) => {
    await supabaseUntyped.from("slots").delete().eq("id", slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));
    toast({ title: "Slot removed" });
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!profile) return null;

  const upcomingSessions = bookings.filter(b => b.status === "confirmed");
  const completedSessions = bookings.filter(b => b.status === "completed");
  const totalEarnings = profile.role === "mentor" ? completedSessions.length * (mentorProfile?.price_per_session || 0) : 0;

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-6xl mx-auto border-b border-border">
        <Link to="/" className="font-display text-lg sm:text-xl font-bold text-foreground">UPSC Connect</Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={avatarUrl || undefined} alt={profile.name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-display">
              {profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{profile.name}</span>
          <Badge variant="secondary" className="text-xs">{profile.role}</Badge>
          <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          {profile.role === "mentor" ? "Mentor" : "Mentee"} Dashboard
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card><CardContent className="pt-4 sm:pt-6"><p className="text-xs sm:text-sm text-muted-foreground">Upcoming</p><p className="text-2xl sm:text-3xl font-display font-bold text-foreground">{upcomingSessions.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4 sm:pt-6"><p className="text-xs sm:text-sm text-muted-foreground">Completed</p><p className="text-2xl sm:text-3xl font-display font-bold text-foreground">{completedSessions.length}</p></CardContent></Card>
          {profile.role === "mentor" && (
            <Card className="col-span-2 sm:col-span-1"><CardContent className="pt-4 sm:pt-6"><p className="text-xs sm:text-sm text-muted-foreground">Total Earnings</p><p className="text-2xl sm:text-3xl font-display font-bold text-accent">₹{totalEarnings}</p></CardContent></Card>
          )}
        </div>

        {profile.role === "mentor" && mentorProfile && (
          <MentorProfileForm
            userId={user!.id}
            profile={{ ...profile, avatar_url: avatarUrl }}
            mentorProfile={mentorProfile}
            onProfileUpdate={(url) => setAvatarUrl(url)}
          />
        )}

        {profile.role === "mentor" && (
          <Card>
            <CardHeader><CardTitle className="font-display">Manage Slots</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)} min={new Date().toISOString().split("T")[0]} /></div>
                <div className="space-y-1"><Label>Start</Label><Input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} /></div>
                <div className="space-y-1"><Label>End</Label><Input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} /></div>
                <Button onClick={addSlot} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Add Slot</Button>
              </div>
              <div className="space-y-2">
                {slots.filter(s => !s.is_booked).map((slot: any) => (
                  <div key={slot.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <span className="font-medium text-foreground">{format(new Date(slot.date), "MMM d, yyyy")}</span>
                      <span className="text-sm text-muted-foreground ml-3">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteSlot(slot.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                {slots.filter(s => !s.is_booked).length === 0 && <p className="text-sm text-muted-foreground">No available slots. Add some above.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="font-display">Sessions</CardTitle></CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-muted-foreground">
                {profile.role === "mentee" ? (<>No bookings yet. <Link to="/mentors" className="text-primary hover:underline">Browse mentors</Link> to get started.</>) : "No sessions yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{profile.role === "mentee" ? `Mentor: ${b.mentor?.name}` : `Mentee: ${b.mentee?.name}`}</p>
                      {b.slots && <p className="text-sm text-muted-foreground">{format(new Date(b.slots.date), "MMM d, yyyy")} · {b.slots.start_time?.slice(0, 5)} – {b.slots.end_time?.slice(0, 5)}</p>}
                    </div>
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "completed" ? "secondary" : "outline"}>{b.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {profile.role === "mentor" && (
          <DeleteMentorAccount onDeleted={() => signOut()} />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
