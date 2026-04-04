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
import { GraduationCap, CheckCircle, Phone, IndianRupee, Camera } from "lucide-react";
import AvatarCropUpload from "@/components/AvatarCropUpload";
import Navbar from "@/components/Navbar";

const UPSC_OPTIONALS = [
  "Geography", "Public Administration", "Anthropology", "Sociology",
  "PSIR", "History", "Philosophy", "Others"
];

const MentorOnboardingPage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState(500);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

  const phoneDigits = phone.replace(/\D/g, "");
  const isPhoneValid = phoneDigits.length === 10;
  const isBioValid = bio.trim().length >= 50;
  const isPriceValid = price >= 99;

  const canProceedStep1 = isPhoneValid && isBioValid && isPriceValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!canProceedStep1) {
      toast({ title: "Please fix the errors before submitting", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      const finalOptional = optionalSubject === "Others" ? customOptional.trim() || "Others" : optionalSubject;

      // Update profile role and phone
      const { error: profileError } = await supabaseUntyped
        .from("profiles")
        .update({ role: "mentor", phone: `+91${phoneDigits}` })
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
          price_per_session: price,
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
              <h2 className="font-display text-2xl font-bold text-foreground">Your profile is under review</h2>
              <p className="text-muted-foreground">
                Our admin team will verify your details and approve your profile. This typically takes 24–48 hours.
              </p>
              <p className="text-sm text-muted-foreground">
                We'll notify you once your mentor profile is approved and visible to aspirants.
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
              {step === 1
                ? "Set up your profile — this is what aspirants will see"
                : "Tell us about your UPSC journey"}
            </CardDescription>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className={`h-2 w-8 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-2 w-8 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 1 && (
                <>
                  {/* Avatar Upload */}
                  <div className="flex justify-center">
                    <AvatarCropUpload
                      userId={user.id}
                      currentUrl={avatarUrl}
                      userName={profile?.name || "M"}
                      onUploaded={(url) => setAvatarUrl(url)}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground -mt-2">Upload a profile photo (optional but recommended)</p>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Phone Number *
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                        +91
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="flex-1"
                      />
                    </div>
                    {phone && !isPhoneValid && (
                      <p className="text-xs text-destructive">Enter a valid 10-digit phone number</p>
                    )}
                    <p className="text-xs text-muted-foreground">Used for session coordination and reminders. Only visible to admin and booked mentees.</p>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">About You *</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell aspirants about your UPSC journey, background, and what you can help with..."
                      rows={4}
                    />
                    <div className="flex justify-between">
                      <p className={`text-xs ${bio.trim().length >= 50 ? "text-muted-foreground" : "text-destructive"}`}>
                        {bio.trim().length < 50 ? `Minimum 50 characters (${bio.trim().length}/50)` : `${bio.trim().length} characters`}
                      </p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2">
                    <Label htmlFor="price" className="flex items-center gap-1.5">
                      <IndianRupee className="h-3.5 w-3.5" /> Session Price (₹) *
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      inputMode="numeric"
                      value={price}
                      onChange={e => setPrice(Number(e.target.value))}
                      min={99}
                    />
                    {price < 99 && (
                      <p className="text-xs text-destructive">Minimum session price is ₹99</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
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

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" size="lg" disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Application"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MentorOnboardingPage;
