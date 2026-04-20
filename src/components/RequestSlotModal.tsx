import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabaseUntyped } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { loadRazorpay } from "@/lib/loadRazorpay";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RequestSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentorId: string;
  mentorName: string;
  pricePerSession: number;
  mentorType: string;
  userId: string;
  userEmail: string;
  userPhone?: string;
}

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

export default function RequestSlotModal({
  open, onOpenChange, mentorId, mentorName, pricePerSession, mentorType, userId, userEmail, userPhone,
}: RequestSlotModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isFree = mentorType === "serving_officer";

  // Helper to call handle-slot-request and verify success
  const confirmPayment = async (requestId: string): Promise<boolean> => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const sess = (await supabaseUntyped.auth.getSession()).data.session;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/handle-slot-request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess?.access_token}`,
        },
        body: JSON.stringify({ request_id: requestId, action: "payment_confirmed" }),
      }
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error("handle-slot-request failed:", data);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!userPhone) {
      toast({ title: "Phone number required", description: "Please add your contact number in your dashboard before requesting a slot.", variant: "destructive" });
      return;
    }
    if (!date || !startTime || !endTime) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }
    if (startTime >= endTime) {
      toast({ title: "End time must be after start time", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: request, error: insertErr } = await supabaseUntyped
        .from("booking_requests")
        .insert({
          mentor_id: mentorId,
          mentee_id: userId,
          requested_date: format(date, "yyyy-MM-dd"),
          requested_start_time: startTime,
          requested_end_time: endTime,
          message: message || null,
          status: isFree ? "pending_mentor_confirmation" : "pending_payment",
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      if (isFree) {
        const ok = await confirmPayment(request.id);
        if (!ok) {
          toast({ title: "Request created but notification failed", description: "The mentor will still see your request. Please contact support if needed.", variant: "destructive" });
        } else {
          toast({ title: "Request submitted!", description: "The mentor has been notified." });
        }
        onOpenChange(false);
        return;
      }

      // Paid session — Razorpay flow
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = (await supabaseUntyped.auth.getSession()).data.session;
      const orderRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-slot-request-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ amount: pricePerSession, request_id: request.id }),
        }
      );
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      const options = {
        key: orderData.key_id,
        amount: pricePerSession * 100,
        currency: "INR",
        name: "UPSC Connect",
        description: `Slot request: ${mentorName} on ${format(date, "MMM d, yyyy")}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            // Save payment_id
            const { error: updateErr } = await supabaseUntyped.from("booking_requests").update({
              payment_id: response.razorpay_payment_id,
            }).eq("id", request.id);

            if (updateErr) {
              console.error("Failed to save payment_id:", updateErr);
            }

            // Confirm payment on backend and verify success
            const ok = await confirmPayment(request.id);
            if (ok) {
              toast({ title: "Request submitted!", description: "The mentor has been notified. They have 4 hours to respond." });
            } else {
              toast({ title: "Payment recorded", description: "Your payment was successful. The request is being processed — you'll receive a notification shortly.", variant: "default" });
            }
            onOpenChange(false);
          } catch (err) {
            console.error("Payment handler error:", err);
            toast({ title: "Payment recorded but processing delayed", description: "Your payment is safe. The request will be processed shortly.", variant: "default" });
            onOpenChange(false);
          }
        },
        modal: {
          ondismiss: async () => {
            await supabaseUntyped.from("booking_requests").update({ status: "cancelled" }).eq("id", request.id);
            toast({ title: "Payment cancelled", variant: "destructive" });
          },
        },
        prefill: { email: userEmail, contact: userPhone || "" },
        theme: { color: "#1a1a2e" },
      };

      await loadRazorpay();
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      toast({ title: "Request failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Request a Slot</DialogTitle>
          <DialogDescription>
            No available slots? Request a custom time and {mentorName} will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Picker */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Preferred Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < addDays(new Date(), 1)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Start Time</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">End Time</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.filter((t) => t > startTime).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Message (optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any specific topics you'd like to discuss..."
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Price Info */}
          {!isFree && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              <p>Session fee: <span className="font-semibold text-accent">₹{pricePerSession}</span></p>
              <p className="text-xs mt-1">Payment will be collected now. Full refund if mentor doesn't respond within 4 hours.</p>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={submitting || !date || !startTime || !endTime} className="w-full">
            {submitting ? "Submitting..." : isFree ? "Submit Request" : `Pay ₹${pricePerSession} & Request`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
