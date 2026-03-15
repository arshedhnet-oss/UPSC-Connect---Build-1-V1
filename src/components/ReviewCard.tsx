import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StarRating from "@/components/StarRating";

interface ReviewCardProps {
  rating: number;
  reviewText: string;
  reviewerName: string;
  reviewerAvatar?: string | null;
  createdAt: string;
}

const ReviewCard = ({ rating, reviewText, reviewerName, reviewerAvatar, createdAt }: ReviewCardProps) => {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={reviewerAvatar || undefined} alt={reviewerName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {reviewerName?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{reviewerName}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(createdAt), "MMM d, yyyy")}</p>
          </div>
        </div>
        <StarRating rating={rating} size="sm" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{reviewText}</p>
    </div>
  );
};

export default ReviewCard;
