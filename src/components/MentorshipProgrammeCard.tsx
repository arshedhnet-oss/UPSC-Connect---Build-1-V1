import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Video, MessageCircle, Target, BookOpen, ClipboardCheck, Users, ArrowRight } from "lucide-react";

const PROGRAMME_LINK = "https://rzp.io/rzp/Okd6enWG";

const highlights = [
  { icon: Video, text: "Upto 10 One-to-One sessions via Google Meet" },
  { icon: MessageCircle, text: "24\u00d77 Doubt clearance via Telegram chat" },
  { icon: Target, text: "High-value strategy & guidance (including CSAT)" },
  { icon: BookOpen, text: "Handpicked practice questions for Prelims 2026" },
  { icon: ClipboardCheck, text: "Last-minute revision + subject-wise checklist" },
  { icon: Users, text: "Bonus: 1:1 session with a 2025 topper" },
];

const MentorshipProgrammeCard = () => {
  return (
    <section className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto animate-fade-in">
      <div className="rounded-xl border border-primary/20 bg-card shadow-md overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Prelims 2026 Mentorship Programme
            </h2>
            <Badge className="bg-destructive text-destructive-foreground text-[10px] uppercase tracking-wide">
              Only 5 Seats Remaining
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base mb-5">
            Personalised guidance to help you clear Prelims with confidence
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-card-foreground">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <h.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="pt-0.5 leading-snug">{h.text}</span>
              </div>
            ))}
          </div>

          {/* Scarcity indicator */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Few spots left</span>
              <span>Only 5 seats remaining</span>
            </div>
            <Progress value={70} className="h-2" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <a href={PROGRAMME_LINK} target="_blank" rel="noopener noreferrer">
                Secure Your Seat <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MentorshipProgrammeCard;
