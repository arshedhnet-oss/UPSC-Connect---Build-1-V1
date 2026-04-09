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
  const hour = Math.floor(i / 2) + 7; // 7 AM to 20:30
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

  const handleSubmit = async () => {
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
      // Create booking request
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
        // Free session — skip payment, set expiry directly
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const sess = (await supabaseUntyped.auth.getSession()).data.session;
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/handle-slot-request`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sess?.access_token}`,
            },
            body: JSON.stringify({ request_id: request.id, action: "payment_confirmed" }),
          }
        );
        toast({ title: "Request submitted!", description: "The mentor has been notified." });
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
            // Update payment_id on the request
            await supabaseUntyped.from("booking_requests").update({
              payment_id: response.razorpay_payment_id,
            }).eq("id", request.id);

            // Confirm payment
            const sess = (await supabaseUntyped.auth.getSession()).data.session;
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/handle-slot-request`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sess?.access_token}`,
                },
                body: JSON.stringify({ request_id: request.id, action: "payment_confirmed" }),
              }
            );

            toast({ title: "Request submitted!", description: "The mentor has been notified. They have 4 hours to respond." });
            onOpenChange(false);
          } catch {
            toast({ title: "Payment recorded but request update failed", description: "Please contact support.", variant: "destructive" });
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
