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

const RatingBar = ({ stars, count, total }: { stars: number; count: number; total: number }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-8 text-right text-muted-foreground">{stars}★</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-muted-foreground">{count}</span>
    </div>
  );
};

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

  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
  }));

  return (
    <Card className="mt-6">
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
          <div className="space-y-6">
            {/* Rating Distribution */}
            <div className="max-w-xs space-y-1">
              {distribution.map(d => (
                <RatingBar key={d.stars} stars={d.stars} count={d.count} total={reviews.length} />
              ))}
            </div>

            {/* Review Cards */}
            <div className="space-y-3">
              {reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  rating={r.rating}
                  reviewText={r.review_text}
                  reviewerName={r.mentee?.name || "Anonymous"}
                  reviewerAvatar={r.mentee?.avatar_url}
                  createdAt={r.created_at}
                  verified
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MentorReviews;
