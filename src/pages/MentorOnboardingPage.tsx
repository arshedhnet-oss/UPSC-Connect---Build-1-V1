import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabaseUntyped } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

const UPSC_OPTIONALS = [
  "Geography", "Public Administration", "Anthropology", "Sociology",
  "PSIR", "History", "Philosophy", "Others"
];

const MentorOnboardingPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bio, setBio] = useState("");
  const [optionalSubject, setOptionalSubject] = useState("");
  const [customOptional, setCustomOptional] = useState("");
  const [mainsWritten, setMainsWritten] = useState(0);
  const [interviewsAppeared, setInterviewsAppeared] = useState(0);
  const [airRank, setAirRank] = useState("");
  const [rankYear, setRankYear] = useState("");
  const [experience, setExperience] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const finalOptional = optionalSubject === "Others" ? customOptional.trim() || "Others" : optionalSubject;

      // Update profile role to mentor
      const { error: profileError } = await supabaseUntyped
        .from("profiles")
        .update({ role: "mentor" })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update user_roles
      const { error: roleError } = await supabaseUntyped
        .from("user_roles")
        .update({ role: "mentor" })
        .eq("user_id", user.id);

      if (roleError) throw roleError;

      // Create mentor_profiles entry
      const { error: mentorError } = await supabaseUntyped
        .from("mentor_profiles")
        .insert({
          user_id: user.id,
          bio: experience ? `${bio}\n\nExperience: ${experience}` : bio,
          optional_subject: finalOptional || null,
          mains_written: mainsWritten,
          interviews_appeared: interviewsAppeared,
          air_rank: airRank ? parseInt(airRank) : null,
          rank_year: rankYear ? parseInt(rankYear) : null,
          is_approved: false,
        });

      if (mentorError) throw mentorError;

      setSubmitted(true);
      toast({ title: "Application submitted!", description: "Your mentor application is pending admin approval." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-12 sm:py-20">
          <Card className="w-full max-w-md animate-fade-in text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">Application Submitted!</h2>
              <p className="text-muted-foreground">
                Your mentor application is now under review. Our admin team will verify your details and approve your profile.
              </p>
              <p className="text-sm text-muted-foreground">
                You'll be notified once your profile is approved and visible to aspirants.
              </p>
              <Button onClick={() => navigate("/dashboard")} className="mt-4">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-8 sm:py-12">
        <Card className="w-full max-w-lg animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <GraduationCap className="h-7 w-7 text-accent" />
            </div>
            <CardTitle className="font-display text-2xl">Mentor Application</CardTitle>
            <CardDescription>
              Tell us about your UPSC journey so we can verify your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">About You *</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  required
                  placeholder="Tell aspirants about your UPSC journey, background, and what you can help with..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Optional Subject</Label>
                <Select value={optionalSubject} onValueChange={setOptionalSubject}>
                  <SelectTrigger><SelectValue placeholder="Select your optional" /></SelectTrigger>
                  <SelectContent>
                    {UPSC_OPTIONALS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {optionalSubject === "Others" && (
                  <Input
                    value={customOptional}
                    onChange={e => setCustomOptional(e.target.value)}
                    placeholder="Enter your optional subject"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mains">UPSC Mains Written</Label>
                  <Input id="mains" type="number" value={mainsWritten} onChange={e => setMainsWritten(Number(e.target.value))} min={0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviews">Interviews Appeared</Label>
                  <Input id="interviews" type="number" value={interviewsAppeared} onChange={e => setInterviewsAppeared(Number(e.target.value))} min={0} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rank">AIR Rank (if selected)</Label>
                  <Input id="rank" type="number" value={airRank} onChange={e => setAirRank(e.target.value)} placeholder="e.g. 234" min={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rankYear">Rank Year</Label>
                  <Input id="rankYear" type="number" value={rankYear} onChange={e => setRankYear(e.target.value)} placeholder="e.g. 2024" min={2000} max={2030} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Additional Experience / Verification Details</Label>
                <Textarea
                  id="experience"
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  placeholder="Any additional details to help verify your profile (service details, coaching background, etc.)"
                  rows={2}
                />
              </div>

              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-accent">
                ⓘ Your profile will be reviewed by our admin team before going live. This typically takes 24–48 hours.
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MentorOnboardingPage;
