import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const RoleSelectionPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"mentee" | "mentor" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    // If user already has a profile with a non-default setup, skip
    if (!loading && profile) {
      if (profile.role === "mentor") {
        navigate("/dashboard");
      }
    }
  }, [loading, user, profile, navigate]);

  const handleContinue = async () => {
    if (!selected || !user) return;
    setSubmitting(true);

    if (selected === "mentor") {
      navigate("/mentor-onboarding");
    } else {
      // Mentee is default — just go to dashboard
      navigate("/dashboard");
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-12 sm:py-20">
        <Card className="w-full max-w-lg animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">How do you want to use UPSC Connect?</CardTitle>
            <CardDescription>Choose how you'd like to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => setSelected("mentee")}
              className={`w-full rounded-xl border-2 p-5 text-left transition-all ${
                selected === "mentee"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">I am preparing for UPSC</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browse mentors, book 1-on-1 sessions, and get personalized guidance for your preparation.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelected("mentor")}
              className={`w-full rounded-xl border-2 p-5 text-left transition-all ${
                selected === "mentor"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <GraduationCap className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">I want to become a Mentor</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share your UPSC experience, guide aspirants, and earn by offering mentorship sessions.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Requires admin approval before going live.
                  </p>
                </div>
              </div>
            </button>

            <Button
              className="w-full mt-2"
              size="lg"
              disabled={!selected || submitting}
              onClick={handleContinue}
            >
              {submitting ? "Setting up..." : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
