import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

const MentorProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mentor, setMentor] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: mp } = await supabaseUntyped
        .from("mentor_profiles")
        .select("*, profiles!mentor_profiles_user_id_fkey(name, avatar_url, email, phone)")
        .eq("user_id", id!)
        .single();
      if (mp) setMentor(mp);

      const { data: sl } = await supabaseUntyped
        .from("slots")
        .select("*")
        .eq("mentor_id", id!)
        .eq("is_booked", false)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (sl) setSlots(sl as Slot[]);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const handleBook = async (slot: Slot) => {
    if (!user) { navigate("/login"); return; }
    if (authProfile?.role !== "mentee") {
      toast({ title: "Only mentees can book sessions", variant: "destructive" });
      return;
    }
    setBooking(true);
    try {
      const { data: bookingData, error: bookingErr } = await supabaseUntyped
        .from("bookings")
        .insert({ mentee_id: user.id, mentor_id: id!, slot_id: slot.id, status: "confirmed" })
        .select()
        .single();
      if (bookingErr) throw bookingErr;

      await supabaseUntyped.from("slots").update({ is_booked: true }).eq("id", slot.id);
      await supabaseUntyped.from("transactions").insert({
        booking_id: bookingData!.id,
        amount: mentor.price_per_session,
        status: "success",
      });

      setSlots(prev => prev.filter(s => s.id !== slot.id));
      toast({ title: "Session booked!", description: `Your session on ${format(new Date(slot.date), "MMM d, yyyy")} is confirmed.` });
    } catch (err: unknown) {
      toast({ title: "Booking failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!mentor) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Mentor not found</div>;

  const p = mentor.profiles;

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b border-border">
        <Link to="/" className="font-display text-xl font-bold text-foreground">UPSC Connect</Link>
        <Button variant="ghost" asChild><Link to="/mentors">← Back to Mentors</Link></Button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start gap-6 mb-8">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary/10 text-primary font-display text-2xl">
              {p?.name?.charAt(0)?.toUpperCase() || "M"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{p?.name}</h1>
            <p className="text-lg text-accent font-semibold mt-1">₹{mentor.price_per_session}/session</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(mentor.subjects || []).map((s: string) => (<Badge key={s} variant="secondary">{s}</Badge>))}
            </div>
          </div>
        </div>

        {mentor.bio && (
          <Card className="mb-8">
            <CardHeader><CardTitle className="font-display">About</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">{mentor.bio}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="font-display">Available Slots</CardTitle></CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <p className="text-muted-foreground">No available slots at the moment.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {slots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{format(new Date(slot.date), "EEE, MMM d, yyyy")}</p>
                      <p className="text-sm text-muted-foreground">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</p>
                    </div>
                    <Button size="sm" onClick={() => handleBook(slot)} disabled={booking}>
                      {booking ? "Booking..." : "Book"}
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

export default MentorProfilePage;
