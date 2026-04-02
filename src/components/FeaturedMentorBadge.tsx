interface FeaturedMentorBadgeProps {
  featuredTag?: string | null;
  className?: string;
}

const FeaturedMentorBadge = ({ featuredTag, className = "" }: FeaturedMentorBadgeProps) => {
  if (!featuredTag) return null;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${className}`}
      style={{
        background: "linear-gradient(90deg, #C9A646, #E6C76A)",
      }}
    >
      {featuredTag}
    </span>
  );
};

export default FeaturedMentorBadge;
