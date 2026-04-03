import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Trash2, Pencil, Calendar } from "lucide-react";
import MentorProfileForm from "@/components/MentorProfileForm";
import DeleteMentorAccount from "@/components/DeleteMentorAccount";
import ReviewModal from "@/components/ReviewModal";
import SessionCard from "@/components/SessionCard";
import SlotManager from "@/components/SlotManager";
import Navbar from "@/components/Navbar";

const DashboardPage = () => {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<any[]>([]);
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewModal, setReviewModal] = useState<{ open: boolean; bookingId: string; mentorId: string; mentorName: string } | null>(null);
  const [chattingWith, setChattingWith] = useState<string | null>(null);

  const handleChatWithMentee = async (menteeId: string) => {
    if (!user) return;
    setChattingWith(menteeId);
    try {
      const { data: existing } = await supabaseUntyped
        .from("conversations")
        .select("id")
        .eq("mentor_id", user.id)
        .eq("mentee_id", menteeId)
        .maybeSingle();

      if (existing) {
        navigate(`/chat?conversation=${existing.id}`);
        return;
      }
      navigate(`/chat?mentee=${menteeId}`);
    } catch {
      toast({ title: "Failed to open chat", variant: "destructive" });
    } finally {
      setChattingWith(null);
    }
  };

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    const { error } = await supabaseUntyped
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (error) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    } else {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      toast({ title: `Session marked as ${status}` });
    }
  };

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

      if (profile.role === "mentee") {
        const { data: reviews } = await supabaseUntyped
          .from("mentor_reviews")
          .select("booking_id")
          .eq("mentee_id", user.id);
        if (reviews) setReviewedBookingIds(new Set(reviews.map((r: any) => r.booking_id)));
      }
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

  const now = new Date();
  const upcomingSessions = bookings.filter(b => {
    if (b.status === "completed" || b.status === "cancelled") return false;
    return true;
  });
  const completedSessions = bookings.filter(b => {
    if (b.status === "completed") return true;
    // Past sessions count as completed even if not marked
    if (b.slots) {
      const sessionDate = new Date(`${b.slots.date}T${b.slots.end_time || "23:59:59"}`);
      if (sessionDate < now && b.status !== "pending_payment") return true;
    }
    return false;
  });

  const totalEarnings = profile.role === "mentor" ? completedSessions.length * (mentorProfile?.price_per_session || 0) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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

        {profile.role === "mentor" && mentorProfile && !editingProfile && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Profile</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Edit Profile
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {avatarUrl && <img src={avatarUrl} alt={profile.name} className="h-12 w-12 rounded-full object-cover" />}
                <div>
                  <p className="font-medium text-foreground">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              {mentorProfile.bio && <p className="text-sm text-muted-foreground">{mentorProfile.bio}</p>}
              <div className="flex flex-wrap gap-2">
                {mentorProfile.optional_subject && <Badge variant="secondary">{mentorProfile.optional_subject}</Badge>}
                {(mentorProfile.languages || []).map((l: string) => <Badge key={l} variant="outline">{l}</Badge>)}
              </div>
              <p className="text-sm text-muted-foreground">₹{mentorProfile.price_per_session} per session</p>
              {!mentorProfile.is_approved && (
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-accent">
                  Your profile is pending admin approval.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {profile.role === "mentor" && mentorProfile && editingProfile && (
          <div className="space-y-3">
            <MentorProfileForm
              userId={user!.id}
              profile={{ ...profile, avatar_url: avatarUrl, phone: profile.phone }}
              mentorProfile={mentorProfile}
              onProfileUpdate={(url) => setAvatarUrl(url)}
            />
            <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
          </div>
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

        {/* Sessions with Tabs */}
        <Card>
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Calendar className="h-5 w-5" /> Sessions</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming" className="space-y-4">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="upcoming" className="text-sm">
                  Upcoming {upcomingSessions.length > 0 && <span className="ml-1.5 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-xs">{upcomingSessions.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-sm">
                  Completed {completedSessions.length > 0 && <span className="ml-1.5 rounded-full bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 text-xs">{completedSessions.length}</span>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No upcoming sessions</p>
                    {profile.role === "mentee" && (
                      <Link to="/mentors" className="text-primary hover:underline text-sm mt-1 inline-block">Browse mentors to get started</Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.map((b: any) => (
                      <SessionCard
                        key={b.id}
                        booking={b}
                        role={profile.role as "mentor" | "mentee"}
                        onChatWithMentee={handleChatWithMentee}
                        onStatusUpdate={profile.role === "mentor" ? handleStatusUpdate : undefined}
                        onReview={(bk) => setReviewModal({ open: true, bookingId: bk.id, mentorId: bk.mentor_id, mentorName: bk.mentor?.name || "Mentor" })}
                        isReviewed={reviewedBookingIds.has(b.id)}
                        chattingWith={chattingWith}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed">
                {completedSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No completed sessions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedSessions.map((b: any) => (
                      <SessionCard
                        key={b.id}
                        booking={b}
                        role={profile.role as "mentor" | "mentee"}
                        onChatWithMentee={handleChatWithMentee}
                        onReview={(bk) => setReviewModal({ open: true, bookingId: bk.id, mentorId: bk.mentor_id, mentorName: bk.mentor?.name || "Mentor" })}
                        isReviewed={reviewedBookingIds.has(b.id)}
                        chattingWith={chattingWith}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {profile.role === "mentor" && (
          <DeleteMentorAccount onDeleted={() => signOut()} />
        )}
      </div>

      {reviewModal && (
        <ReviewModal
          open={reviewModal.open}
          onOpenChange={(open) => { if (!open) setReviewModal(null); }}
          bookingId={reviewModal.bookingId}
          mentorId={reviewModal.mentorId}
          menteeId={user!.id}
          mentorName={reviewModal.mentorName}
          onReviewSubmitted={() => {
            setReviewedBookingIds(prev => new Set([...prev, reviewModal.bookingId]));
            setReviewModal(null);
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
