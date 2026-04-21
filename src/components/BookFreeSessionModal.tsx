import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, CheckCircle2, Copy, Video } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabaseUntyped } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface Confirmation {
  meeting_link: string;
  meeting_passcode: string;
  session_date: string;
  session_time: string;
  mentor_name: string | null;
  session_number: number;
}

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function digitsOnly(s: string) {
  return s.replace(/\D/g, "").replace(/^91/, "").slice(-10);
}

export default function BookFreeSessionModal({ open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [usedCount, setUsedCount] = useState<number | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [slotId, setSlotId] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const isLoggedIn = !!user;
  const limitReached = usedCount !== null && usedCount >= 2;

  // Pre-fill from profile
  useEffect(() => {
    if (open && profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone ? digitsOnly(profile.phone) : "");
      setWhatsapp(profile.phone ? digitsOnly(profile.phone) : "");
    }
  }, [open, profile]);

  // Load chat mentor's slots + usage count
  useEffect(() => {
    if (!open || !isLoggedIn) return;
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      try {
        const { data: chatMentor } = await supabaseUntyped
          .from("mentor_profiles")
          .select("user_id")
          .eq("is_default_chat_mentor", true)
          .eq("is_approved", true)
          .maybeSingle();
        if (!chatMentor?.user_id || cancelled) {
          setSlots([]);
          return;
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: slotData } = await supabaseUntyped
          .from("slots")
          .select("id, date, start_time, end_time")
          .eq("mentor_id", chatMentor.user_id)
          .eq("is_active", true)
          .eq("is_booked", false)
          .gte("date", todayStr)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });
        if (!cancelled) setSlots((slotData as Slot[]) || []);

        const { count } = await supabaseUntyped
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("mentee_id", user!.id)
          .eq("status", "free_session_confirmed");
        if (!cancelled) setUsedCount(count ?? 0);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, isLoggedIn, user]);

  // Reset transient state when closing
  useEffect(() => {
    if (!open) {
      setConfirmation(null);
      setDate(undefined);
      setSlotId("");
    }
  }, [open]);

  const availableDates = useMemo(() => {
    const set = new Set(slots.map(s => s.date));
    return set;
  }, [slots]);

  const slotsForDate = useMemo(() => {
    if (!date) return [];
    const d = format(date, "yyyy-MM-dd");
    return slots.filter(s => s.date === d);
  }, [slots, date]);

  const handleAuthRequired = () => {
    toast({ title: "Please sign up or log in to book your free 1:1 session." });
    navigate("/signup", { state: { from: "/", intent: "book_free_session" } });
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) return handleAuthRequired();
    if (limitReached) return;

    if (!slotId) {
      toast({ title: "Please pick a time slot", variant: "destructive" });
      return;
    }
    const cleanPhone = digitsOnly(phone);
    const cleanWa = digitsOnly(whatsapp);
    if (!name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    if (!EMAIL_RE.test(email.trim())) return toast({ title: "Enter a valid email", variant: "destructive" });
    if (!PHONE_RE.test(cleanPhone)) return toast({ title: "Enter a valid 10-digit Indian phone number", variant: "destructive" });
    if (!PHONE_RE.test(cleanWa)) return toast({ title: "Enter a valid 10-digit WhatsApp number", variant: "destructive" });

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-free-session", {
        body: {
          slot_id: slotId,
          name: name.trim(),
          email: email.trim(),
          phone: cleanPhone,
          whatsapp: cleanWa,
        },
      });
      if (error) {
        // try to read a detailed message from the body
        const msg = (error as any)?.context?.body
          ? await (error as any).context.body.text?.().catch(() => "")
          : "";
        let parsed: any = null;
        try { parsed = msg ? JSON.parse(msg) : null; } catch { /* ignore */ }
        if (parsed?.error === "limit_reached") {
          toast({ title: "Free session limit reached", description: parsed.message, variant: "destructive" });
          setUsedCount(2);
        } else {
          toast({ title: "Booking failed", description: parsed?.error || error.message, variant: "destructive" });
        }
        return;
      }
      if (!data?.success) {
        toast({ title: "Booking failed", description: data?.error || "Try again", variant: "destructive" });
        return;
      }
      setConfirmation({
        meeting_link: data.meeting_link,
        meeting_passcode: data.meeting_passcode,
        session_date: data.session_date,
        session_time: data.session_time,
        mentor_name: data.mentor_name,
        session_number: data.session_number,
      });
    } catch (err: any) {
      toast({ title: "Booking failed", description: err?.message || "Server error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- UI ----
  if (!isLoggedIn && open) {
    // Auth-gate: render a brief prompt then redirect on action
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Sign up to book your free session</DialogTitle>
            <DialogDescription>
              Please sign up or log in to book your free 1:1 session.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button onClick={handleAuthRequired} className="flex-1">Sign Up</Button>
            <Button variant="outline" onClick={() => { navigate("/login", { state: { intent: "book_free_session" } }); onOpenChange(false); }} className="flex-1">
              Log In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {confirmation ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Your free session is booked!
              </DialogTitle>
              <DialogDescription>
                Check your email and dashboard for details.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm">
              <div><span className="text-muted-foreground">Mentor:</span> <strong>{confirmation.mentor_name || "Chat Mentor"}</strong></div>
              <div><span className="text-muted-foreground">Date:</span> <strong>{confirmation.session_date}</strong></div>
              <div><span className="text-muted-foreground">Time:</span> <strong>{confirmation.session_time}</strong></div>
              <div className="flex items-center gap-2 pt-1">
                <Video className="h-4 w-4 text-primary" />
                <a href={confirmation.meeting_link} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                  {confirmation.meeting_link}
                </a>
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(confirmation.meeting_link); toast({ title: "Link copied" }); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Passcode: <span className="font-mono">{confirmation.meeting_passcode}</span></div>
              <div className="text-xs text-muted-foreground pt-1">Session {confirmation.session_number} of 2</div>
            </div>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Book a Free 1:1 Session</DialogTitle>
              <DialogDescription>
                {limitReached
                  ? "You've used both your free sessions."
                  : `Pick a time with our Chat Mentor. ${usedCount !== null ? `${usedCount}/2 free sessions used.` : ""}`}
              </DialogDescription>
            </DialogHeader>

            {limitReached ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
                  You've already used your 2 free sessions. You can continue with paid mentorship.
                </div>
                <Button className="w-full" onClick={() => { navigate("/mentors"); onOpenChange(false); }}>Browse Paid Mentors</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Pick a date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1.5", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : (loadingSlots ? "Loading availability…" : "Pick a date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => { setDate(d); setSlotId(""); }}
                        disabled={(d) => !availableDates.has(format(d, "yyyy-MM-dd"))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {!loadingSlots && slots.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">No slots available right now. Please check back soon.</p>
                  )}
                </div>

                {date && slotsForDate.length > 0 && (
                  <div>
                    <Label className="text-sm">Available time slots</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                      {slotsForDate.map(s => (
                        <Button
                          key={s.id}
                          type="button"
                          variant={slotId === s.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSlotId(s.id)}
                        >
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Full Name *</Label>
                    <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                  </div>
                  <div>
                    <Label className="text-sm">Email *</Label>
                    <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
                  </div>
                  <div>
                    <Label className="text-sm">Phone (10-digit) *</Label>
                    <Input className="mt-1.5" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} placeholder="9876543210" />
                  </div>
                  <div>
                    <Label className="text-sm">WhatsApp (10-digit) *</Label>
                    <Input className="mt-1.5" type="tel" inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={15} placeholder="9876543210" />
                  </div>
                </div>

                <Button onClick={handleSubmit} disabled={submitting || !slotId} className="w-full">
                  {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking…</>) : "Confirm Free Session"}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
