import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

const sizeMap = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-6 w-6" };

const StarRating = ({ rating, maxStars = 5, size = "md", interactive = false, onRate }: StarRatingProps) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < rating;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate?.(i + 1)}
            className={cn(
              "transition-colors",
              interactive ? "cursor-pointer hover:scale-110" : "cursor-default",
              "disabled:opacity-100"
            )}
          >
            <Star
              className={cn(
                sizeMap[size],
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
