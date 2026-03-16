import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabaseUntyped } from "@/lib/supabase";
import StarRating from "@/components/StarRating";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  mentorId: string;
  menteeId: string;
  mentorName: string;
  onReviewSubmitted?: () => void;
}

const ReviewModal = ({ open, onOpenChange, bookingId, mentorId, menteeId, mentorName, onReviewSubmitted }: ReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const isValid = rating >= 1 && text.trim().length >= 10 && text.trim().length <= 500;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const { error } = await supabaseUntyped.from("mentor_reviews").insert({
        mentor_id: mentorId,
        mentee_id: menteeId,
        booking_id: bookingId,
        rating,
        review_text: text.trim(),
      });
      if (error) throw error;
      toast({ title: "Review submitted!", description: `Thank you for reviewing ${mentorName}.` });
      setRating(0);
      setText("");
      onOpenChange(false);
      onReviewSubmitted?.();
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      toast({ title: "Failed to submit review", description: msg.includes("duplicate") ? "You have already reviewed this session." : msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Review {mentorName}</DialogTitle>
          <DialogDescription>Share your experience from this session.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Rating</p>
            <StarRating rating={rating} size="lg" interactive onRate={setRating} />
            {rating === 0 && <p className="text-xs text-muted-foreground mt-1">Select a rating</p>}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Your Review</p>
            <Textarea
              placeholder="Share your experience (min 10 characters)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={4}
            />
            <p className={`text-xs mt-1 ${text.trim().length < 10 ? "text-muted-foreground" : "text-green-600"}`}>
              {text.trim().length}/500 characters {text.trim().length < 10 && "(Review must contain at least 10 characters.)"}
            </p>
          </div>
          <Button onClick={handleSubmit} disabled={!isValid || submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
