import { GraduationCap } from "lucide-react";

const PROGRAMME_LINK = "https://rzp.io/rzp/Okd6enWG";

const MentorshipFloatingCTA = () => {
  return (
    <a
      href={PROGRAMME_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold shadow-lg hover:bg-primary/90 transition-all hover:scale-105 animate-fade-in"
      style={{ animationDelay: "1s" }}
    >
      <GraduationCap className="h-4 w-4" />
      <span className="hidden sm:inline">Join Mentorship</span>
    </a>
  );
};

export default MentorshipFloatingCTA;
