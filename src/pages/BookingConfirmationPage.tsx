import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { CheckCircle2, Calendar, Clock, User, CreditCard, Video, ArrowRight, Home } from "lucide-react";
import Navbar from "@/components/Navbar";

interface BookingDetails {
  id: string;
  status: string;
  meeting_link: string | null;
  meeting_passcode: string | null;
  created_at: string;
  mentor_id: string;
  slot: {
    date: string;
    start_time: string;
    end_time: string;
  };
  mentor_name: string;
  mentor_avatar: string | null;
  transaction: {
    amount: number;
    razorpay_payment_id: string | null;
    status: string;
  } | null;
}

const BookingConfirmationPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      navigate("/dashboard");
      return;
    }

    const fetchBooking = async () => {
      try {
        const { data: b } = await supabaseUntyped
          .from("bookings")
          .select("id, status, meeting_link, meeting_passcode, created_at, mentor_id, slot_id")
          .eq("id", bookingId)
          .single();

        if (!b || (b.status !== "confirmed" && b.status !== "completed")) {
          navigate("/dashboard");
          return;
        }

        const [slotRes, profileRes, txRes] = await Promise.all([
          supabaseUntyped.from("slots").select("date, start_time, end_time").eq("id", b.slot_id).single(),
          supabaseUntyped.from("mentor_public_profiles_view").select("name, avatar_url").eq("id", b.mentor_id).single(),
          supabaseUntyped.from("transactions").select("amount, razorpay_payment_id, status").eq("booking_id", b.id).order("created_at", { ascending: false }).limit(1).single(),
        ]);

        setBooking({
          id: b.id,
          status: b.status,
          meeting_link: b.meeting_link,
          meeting_passcode: b.meeting_passcode,
          created_at: b.created_at,
          mentor_id: b.mentor_id,
          slot: slotRes.data || { date: "", start_time: "", end_time: "" },
          mentor_name: profileRes.data?.name || "Mentor",
          mentor_avatar: profileRes.data?.avatar_url || null,
          transaction: txRes.data || null,
        });
      } catch {
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, navigate]);

  // Prevent back navigation to payment page
  useEffect(() => {
    const handlePopState = () => {
      navigate("/dashboard", { replace: true });
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  const buildGoogleCalendarUrl = () => {
    if (!booking?.slot) return null;
    const dateStr = booking.slot.date.replace(/-/g, "");
    const startStr = booking.slot.start_time.replace(/:/g, "").slice(0, 4) + "00";
    const endStr = booking.slot.end_time.replace(/:/g, "").slice(0, 4) + "00";
    const title = encodeURIComponent(`UPSC Connect Session with ${booking.mentor_name}`);
    const details = encodeURIComponent(
      booking.meeting_link
        ? `Meeting Link: ${booking.meeting_link}${booking.meeting_passcode ? `\nPasscode: ${booking.meeting_passcode}` : ""}`
        : "Meeting details will be available in your dashboard."
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T${startStr}/${dateStr}T${endStr}&details=${details}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <p className="text-muted-foreground">Loading confirmation...</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const calendarUrl = buildGoogleCalendarUrl();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-8 sm:py-16">
        <div className="w-full max-w-lg space-y-6">
          {/* Success Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Booking Confirmed
            </h1>
            <p className="text-muted-foreground">
              Your mentorship session has been successfully scheduled.
            </p>
          </div>

          {/* Key Instruction */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium text-foreground">
                Check your{" "}
                <Link to="/dashboard" className="text-primary underline underline-offset-2 font-semibold">
                  Bookings Dashboard
                </Link>{" "}
                for meeting details
              </p>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Session Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Mentor</p>
                    <p className="font-medium text-foreground">{booking.mentor_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium text-foreground">
                      {booking.slot.date ? format(new Date(booking.slot.date), "EEEE, MMMM d, yyyy") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium text-foreground">
                      {booking.slot.start_time?.slice(0, 5)} – {booking.slot.end_time?.slice(0, 5)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Details */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Video className="h-5 w-5" /> Meeting Details
              </h2>
              {booking.meeting_link ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Meeting Link</p>
                    <a
                      href={booking.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline text-sm break-all"
                    >
                      {booking.meeting_link}
                    </a>
                  </div>
                  {booking.meeting_passcode && (
                    <div>
                      <p className="text-sm text-muted-foreground">Passcode</p>
                      <p className="font-mono font-medium text-foreground">{booking.meeting_passcode}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Meeting details will be available in your dashboard shortly.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Confirmation */}
          {booking.transaction && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Payment Confirmation
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold text-foreground">₹{booking.transaction.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                    <span className="text-sm font-medium text-green-600">Paid</span>
                  </div>
                  {booking.transaction.razorpay_payment_id && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Reference ID</span>
                      <span className="text-sm font-mono text-foreground">{booking.transaction.razorpay_payment_id}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reminder */}
          <p className="text-center text-sm text-muted-foreground">
            You'll receive a reminder before your session.
          </p>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => navigate("/dashboard")}>
              Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            {calendarUrl && (
              <Button variant="outline" className="w-full" size="lg" asChild>
                <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
                  <Calendar className="h-4 w-4 mr-1.5" /> Add to Google Calendar
                </a>
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-1.5" /> Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;
