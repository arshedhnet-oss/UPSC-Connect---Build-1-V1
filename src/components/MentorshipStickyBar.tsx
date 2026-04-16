import { useState } from "react";
import { X } from "lucide-react";

const PROGRAMME_LINK = "https://rzp.io/rzp/Okd6enWG";

const MentorshipStickyBar = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 sm:gap-4 bg-primary text-primary-foreground px-3 sm:px-6 py-2 text-xs sm:text-sm font-medium max-h-[50px] animate-fade-in">
      <span className="truncate">
        <span className="hidden sm:inline">UC Booster Prelims 2026 Mentorship Programme – </span>
        <span className="sm:hidden">Prelims 2026 Programme – </span>
        Only 5 Seats remaining
      </span>
      <a
        href={PROGRAMME_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full bg-white text-primary px-3 py-0.5 text-xs font-semibold hover:bg-white/90 transition-colors"
      >
        Join Now
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-0.5 rounded hover:bg-primary-foreground/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default MentorshipStickyBar;
