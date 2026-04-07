interface FeaturedMentorBadgeProps {
  featuredTag?: string | null;
  className?: string;
}

const gradientMap: Record<string, string> = {
  "UPSC Rank Holder": "linear-gradient(135deg, #C9A646, #E6C76A)",
  "Serving Officer": "linear-gradient(135deg, #1e3a8a, #2563eb)",
  "Verified Mentor": "linear-gradient(135deg, #4f46e5, #7c3aed)",
};

const FeaturedMentorBadge = ({ featuredTag, className = "" }: FeaturedMentorBadgeProps) => {
  if (!featuredTag) return null;

  const background = gradientMap[featuredTag] || gradientMap["UPSC Rank Holder"];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white transition-all duration-200 hover:-translate-y-px hover:brightness-105 ${className}`}
      style={{
        background,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      {featuredTag}
    </span>
  );
};

export default FeaturedMentorBadge;
