interface AirRankLabelProps {
  airRank?: number | null;
  rankYear?: number | null;
  variant?: "overlay" | "inline";
  className?: string;
}

const AirRankLabel = ({ airRank, rankYear, variant = "inline", className = "" }: AirRankLabelProps) => {
  if (!airRank) return null;

  const text = rankYear ? `AIR ${airRank} \u2022 ${rankYear}` : `AIR ${airRank}`;

  if (variant === "overlay") {
    return (
      <span
        className={`whitespace-nowrap inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide text-white ${className}`}
        style={{ background: "rgba(24, 24, 27, 0.85)" }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide text-white ${className}`}
      style={{ background: "rgba(24, 24, 27, 0.85)" }}
    >
      {text}
    </span>
  );
};

export default AirRankLabel;
