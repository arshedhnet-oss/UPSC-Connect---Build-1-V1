import { useEffect, useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StarRating from "@/components/StarRating";
import ReviewCard from "@/components/ReviewCard";

interface MentorReviewsProps {
  mentorId: string;
  averageRating: number;
  totalReviews: number;
}

const MentorReviews = ({ mentorId, averageRating, totalReviews }: MentorReviewsProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabaseUntyped
        .from("mentor_reviews")
        .select("*, mentee:profiles!mentor_reviews_mentee_id_fkey(name, avatar_url)")
        .eq("mentor_id", mentorId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (data) setReviews(data);
      setLoading(false);
    };
    fetchReviews();
  }, [mentorId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Reviews</span>
          {totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={Math.round(averageRating)} size="sm" />
              <span className="text-base font-semibold text-foreground">{averageRating} / 5</span>
              <span className="text-sm text-muted-foreground">({totalReviews} review{totalReviews !== 1 ? "s" : ""})</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                rating={r.rating}
                reviewText={r.review_text}
                reviewerName={r.mentee?.name || "Anonymous"}
                reviewerAvatar={r.mentee?.avatar_url}
                createdAt={r.created_at}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MentorReviews;
