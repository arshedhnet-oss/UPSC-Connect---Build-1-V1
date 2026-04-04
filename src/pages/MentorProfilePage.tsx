import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MessageSquare, Send, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import MentorReviews from "@/components/MentorReviews";
import ReviewModal from "@/components/ReviewModal";
import StarRating from "@/components/StarRating";
import FeaturedMentorBadge from "@/components/FeaturedMentorBadge";
import AirRankLabel from "@/components/AirRankLabel";

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
  const [booking, setBooking] = useState<string | null>(null);
  const [eligibleBookings, setEligibleBookings] = useState<any[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewModal, setReviewModal] = useState<{ open: boolean; bookingId: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: mp } = await supabaseUntyped
        .from("mentor_profiles")
        .select("*")
        .eq("user_id", id!)
        .single();
      if (mp) {
        // Fetch public profile data from the secure view (works for anon + auth)
        const { data: pubProfile } = await supabaseUntyped
          .from("mentor_public_profiles_view")
          .select("name, avatar_url")
          .eq("id", id!)
          .single();
        setMentor({ ...mp, profiles: pubProfile || { name: "Mentor", avatar_url: null } });
      }

      const today = new Date().toISOString().split("T")[0];
      const nowTime = new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Kolkata" }).slice(0, 5);

      const { data: sl } = await supabaseUntyped
        .from("slots")
        .select("*")
        .eq("mentor_id", id!)
        .eq("is_booked", false)
        .eq("is_active", true)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      // Frontend safety filter: remove past slots (same-day slots where time has passed)
      const filtered = (sl || []).filter((s: Slot) => {
        if (s.date > today) return true;
        if (s.date === today && s.start_time.slice(0, 5) > nowTime) return true;
        return false;
      });
      setSlots(filtered as Slot[]);

      // Check eligible bookings for review (mentee only)
      if (user && authProfile?.role === "mentee") {
        const { data: completedBookings } = await supabaseUntyped
          .from("bookings")
          .select("id, mentor_id")
          .eq("mentee_id", user.id)
          .eq("mentor_id", id!)
          .eq("status", "completed");
        if (completedBookings) setEligibleBookings(completedBookings);

        const { data: existingReviews } = await supabaseUntyped
          .from("mentor_reviews")
          .select("booking_id")
          .eq("mentee_id", user.id)
          .eq("mentor_id", id!);
        if (existingReviews) setReviewedBookingIds(new Set(existingReviews.map((r: any) => r.booking_id)));
      }

      setLoading(false);
    };
    if (id) fetchData();
  }, [id, user, authProfile]);

  const handleBook = async (slot: Slot) => {
    if (!user) { navigate("/login"); return; }
    if (authProfile?.role !== "mentee") {
      toast({ title: "Only mentees can book sessions", variant: "destructive" });
      return;
    }
    // Re-validate slot is still in the future
    const now = new Date();
    const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
    if (slotDateTime <= now) {
      toast({ title: "This time slot is no longer available", variant: "destructive" });
      setSlots(prev => prev.filter(s => s.id !== slot.id));
      return;
    }
    setBooking(slot.id);
    try {
      const { data: bookingData, error: bookingErr } = await supabaseUntyped
        .from("bookings")
        .insert({ mentee_id: user.id, mentor_id: id!, slot_id: slot.id, status: "pending_payment" })
        .select()
        .single();
      if (bookingErr) throw bookingErr;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = (await supabaseUntyped.auth.getSession()).data.session;
      const orderRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-razorpay-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            amount: mentor.price_per_session,
            booking_id: bookingData.id,
          }),
        }
      );
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      const p = mentor.profiles;
      const options = {
        key: orderData.key_id,
        amount: mentor.price_per_session * 100,
        currency: "INR",
        name: "UPSC Connect",
        description: `Session with ${p?.name} on ${format(new Date(slot.date), "MMM d, yyyy")}`,
        order_id: orderData.order_id,
        handler: async (_response: any) => {
          try {
            // Call server function to confirm booking, create meeting, and send emails
            // (uses service role key to bypass RLS)
            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            const sess = (await supabaseUntyped.auth.getSession()).data.session;
            const res = await fetch(
              `https://${projectId}.supabase.co/functions/v1/send-booking-emails`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sess?.access_token}`,
                },
                body: JSON.stringify({ booking_id: bookingData.id }),
              }
            );
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to confirm booking");

            setSlots(prev => prev.filter(s => s.id !== slot.id));
            navigate(`/booking-confirmed/${bookingData.id}`, { replace: true });
          } catch {
            toast({ title: "Payment recorded but booking update failed", description: "Please contact support.", variant: "destructive" });
          }
        },
        modal: {
          ondismiss: async () => {
            await supabaseUntyped
              .from("bookings")
              .update({ status: "cancelled" })
              .eq("id", bookingData.id);
            toast({ title: "Payment cancelled", variant: "destructive" });
          },
        },
        prefill: {
          email: authProfile?.email || user.email,
          contact: authProfile?.phone || "",
        },
        theme: { color: "#1a1a2e" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      toast({ title: "Booking failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setBooking(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!mentor) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Mentor not found</div>;

  const p = mentor.profiles;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          {/* Avatar + AIR Tag */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
              <AvatarImage src={p?.avatar_url || undefined} alt={p?.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-display text-2xl sm:text-3xl">
                {p?.name?.charAt(0)?.toUpperCase() || "M"}
              </AvatarFallback>
            </Avatar>
            {mentor.air_rank && <AirRankLabel airRank={mentor.air_rank} rankYear={mentor.rank_year} variant="overlay" />}
          </div>

          {/* Name + Featured Badge */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{p?.name}</h1>
              {mentor.is_featured && <FeaturedMentorBadge featuredTag={mentor.featured_tag} />}
            </div>

            {mentor.air_rank && (
              <p className="text-sm font-medium text-foreground">
                All India Rank {mentor.air_rank} (UPSC CSE {mentor.rank_year || ""})
              </p>
            )}

            {/* Price + Rating */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <p className="text-lg text-accent font-semibold">₹{mentor.price_per_session}/session</p>
              {(mentor.total_reviews || 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={Math.round(mentor.average_rating || 0)} size="sm" />
                  <span className="text-sm text-muted-foreground">{mentor.average_rating} ({mentor.total_reviews})</span>
                </div>
              )}
            </div>

            {/* Subjects */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {(mentor.subjects || []).map((s: string) => (<Badge key={s} variant="secondary">{s}</Badge>))}
            </div>

            {mentor.optional_subject && (
              <p className="text-sm text-muted-foreground">Optional: {mentor.optional_subject}</p>
            )}

            {mentor.is_featured && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Verified by UPSC Connect</span>
              </div>
            )}

            {user && authProfile?.role === "mentee" && id !== user.id && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/chat?mentor=${id}`)}>
                <Send className="h-4 w-4 mr-1.5" /> Message Mentor
              </Button>
            )}
            {!user && (
              <Button size="sm" variant="outline" onClick={() => navigate("/login")}>
                <Send className="h-4 w-4 mr-1.5" /> Message Mentor
              </Button>
            )}

            {(mentor.languages || []).length > 0 && (
              <p className="text-sm text-muted-foreground">🗣 {mentor.languages.join(", ")}</p>
            )}
          </div>
        </div>

        {mentor.bio && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="font-display">About</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">{mentor.bio}</p></CardContent>
          </Card>
        )}

        {(mentor.mains_written > 0 || mentor.interviews_appeared > 0) && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="font-display">UPSC Experience</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {mentor.mains_written > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Mains Written:</span> {mentor.mains_written} time{mentor.mains_written > 1 ? "s" : ""}
                  {(mentor.mains_years || []).length > 0 && ` (${mentor.mains_years.join(", ")})`}
                </p>
              )}
              {mentor.interviews_appeared > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Interviews Appeared:</span> {mentor.interviews_appeared} time{mentor.interviews_appeared > 1 ? "s" : ""}
                  {(mentor.interview_years || []).length > 0 && ` (${mentor.interview_years.join(", ")})`}
                </p>
              )}
            </CardContent>
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
                    <Button size="sm" onClick={() => handleBook(slot)} disabled={booking === slot.id}>
                      {booking === slot.id ? "Booking..." : "Book"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Write a Review button for eligible mentees */}
        {user && authProfile?.role === "mentee" && eligibleBookings.length > 0 && (() => {
          const unreviewedBooking = eligibleBookings.find(b => !reviewedBookingIds.has(b.id));
          if (!unreviewedBooking) return null;
          return (
            <div className="mt-6">
              <Button onClick={() => setReviewModal({ open: true, bookingId: unreviewedBooking.id })}>
                <MessageSquare className="h-4 w-4 mr-2" /> Write a Review
              </Button>
            </div>
          );
        })()}

        <MentorReviews
          mentorId={id!}
          averageRating={mentor.average_rating || 0}
          totalReviews={mentor.total_reviews || 0}
        />
      </div>

      {reviewModal && (
        <ReviewModal
          open={reviewModal.open}
          onOpenChange={(open) => { if (!open) setReviewModal(null); }}
          bookingId={reviewModal.bookingId}
          mentorId={id!}
          menteeId={user!.id}
          mentorName={p?.name || "Mentor"}
          onReviewSubmitted={() => {
            setReviewedBookingIds(prev => new Set([...prev, reviewModal.bookingId]));
            setReviewModal(null);
            // Refresh page data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default MentorProfilePage;
