import { useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AvatarCropUpload from "@/components/AvatarCropUpload";
import { X } from "lucide-react";

const UPSC_OPTIONALS = [
  "Geography", "Public Administration", "Anthropology", "Sociology",
  "PSIR", "History", "Philosophy", "Others"
];

const COMMON_LANGUAGES = ["English", "Hindi", "Urdu", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati", "Punjabi"];

interface MentorProfileFormProps {
  userId: string;
  profile: { name: string; avatar_url: string | null; role: string; email: string; phone?: string | null };
  mentorProfile: any;
  onProfileUpdate: (url: string) => void;
}

export default function MentorProfileForm({ userId, profile, mentorProfile, onProfileUpdate }: MentorProfileFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(() => {
    const p = profile.phone || "";
    return p.startsWith("+91") ? p.slice(3) : p;
  });
  const [bio, setBio] = useState(mentorProfile.bio || "");
  const [subjects, setSubjects] = useState((mentorProfile.subjects || []).join(", "));
  const [price, setPrice] = useState(mentorProfile.price_per_session || 500);
  const [mentorType, setMentorType] = useState(mentorProfile.mentor_type || "aspirant");
  const [languages, setLanguages] = useState<string[]>(mentorProfile.languages || []);
  const [langInput, setLangInput] = useState("");
  const [optionalSubject, setOptionalSubject] = useState(mentorProfile.optional_subject || "");
  const [customOptional, setCustomOptional] = useState("");
  const [mainsWritten, setMainsWritten] = useState(mentorProfile.mains_written || 0);
  const [interviewsAppeared, setInterviewsAppeared] = useState(mentorProfile.interviews_appeared || 0);
  const [mainsYears, setMainsYears] = useState((mentorProfile.mains_years || []).join(", "));
  const [interviewYears, setInterviewYears] = useState((mentorProfile.interview_years || []).join(", "));

  const addLanguage = (lang: string) => {
    const trimmed = lang.trim();
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages(prev => [...prev, trimmed]);
    }
    setLangInput("");
  };

  const removeLanguage = (lang: string) => {
    setLanguages(prev => prev.filter(l => l !== lang));
  };

  const handleSave = async () => {
    const subjectArr = subjects.split(",").map(s => s.trim()).filter(Boolean);
    const mainsYearArr = mainsYears.split(",").map(s => s.trim()).filter(Boolean);
    const interviewYearArr = interviewYears.split(",").map(s => s.trim()).filter(Boolean);

    const finalOptional = optionalSubject === "Others" ? customOptional.trim() || "Others" : optionalSubject;

    const phoneDigits = phone.replace(/\D/g, "");

    // Update profile name and phone
    const { error: nameError } = await supabaseUntyped
      .from("profiles")
      .update({ name, phone: phoneDigits ? `+91${phoneDigits}` : null })
      .eq("id", userId);

    if (nameError) {
      toast({ title: "Profile update failed", description: nameError.message, variant: "destructive" });
      return;
    }

    const isServingOfficer = mentorType === "serving_officer";

    const { error } = await supabaseUntyped
      .from("mentor_profiles")
      .update({
        bio,
        subjects: subjectArr,
        mentor_type: mentorType,
        price_per_session: isServingOfficer ? 0 : price,
        languages,
        optional_subject: finalOptional || null,
        mains_written: mainsWritten,
        interviews_appeared: interviewsAppeared,
        mains_years: mainsYearArr,
        interview_years: interviewYearArr,
      })
      .eq("user_id", userId);

    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated!" });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="font-display">Edit Profile</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <AvatarCropUpload
          userId={userId}
          currentUrl={profile.avatar_url}
          userName={profile.name}
          onUploaded={onProfileUpdate}
        />
        {!mentorProfile.is_approved && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-accent">
            Your profile is pending admin approval.
          </div>
        )}

        <div className="space-y-2">
          <Label>Phone Number</Label>
          <div className="flex gap-2">
            <div className="flex items-center justify-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">+91</div>
            <Input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">Only visible to admin and booked mentees.</p>
        </div>

        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell aspirants about your experience..." />
        </div>

        <div className="space-y-2">
          <Label>Subjects (comma-separated)</Label>
          <Input value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="Geography Optional, Ethics, Essay" />
        </div>

        <div className="space-y-2">
          <Label>Optional Subject</Label>
          <Select value={optionalSubject} onValueChange={setOptionalSubject}>
            <SelectTrigger><SelectValue placeholder="Select optional subject" /></SelectTrigger>
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

        <div className="space-y-2">
          <Label>Language Proficiency</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {languages.map(lang => (
              <Badge key={lang} variant="secondary" className="gap-1">
                {lang}
                <button onClick={() => removeLanguage(lang)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Select onValueChange={(val) => addLanguage(val)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Add a language" /></SelectTrigger>
              <SelectContent>
                {COMMON_LANGUAGES.filter(l => !languages.includes(l)).map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={langInput}
              onChange={e => setLangInput(e.target.value)}
              placeholder="Other"
              className="w-28"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLanguage(langInput); } }}
            />
            {langInput && (
              <Button variant="outline" size="sm" onClick={() => addLanguage(langInput)}>Add</Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mentor Type</Label>
          <Select value={mentorType} onValueChange={(val) => {
            setMentorType(val);
            if (val === "serving_officer") setPrice(0);
            else if (price === 0) setPrice(500);
          }}>
            <SelectTrigger><SelectValue placeholder="Select mentor type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="aspirant">UPSC Aspirant / Qualified</SelectItem>
              <SelectItem value="serving_officer">Serving Officer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mentorType !== "serving_officer" ? (
          <div className="space-y-2">
            <Label>Price per session (₹)</Label>
            <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={99} />
            {price < 99 && (
              <p className="text-xs text-destructive">Minimum session price is ₹99</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">As a serving officer, your sessions are offered voluntarily at no cost.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>UPSC Mains Written</Label>
            <Input type="number" value={mainsWritten} onChange={e => setMainsWritten(Number(e.target.value))} min={0} />
          </div>
          <div className="space-y-2">
            <Label>UPSC Interviews Appeared</Label>
            <Input type="number" value={interviewsAppeared} onChange={e => setInterviewsAppeared(Number(e.target.value))} min={0} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Mains Years (comma-separated)</Label>
            <Input value={mainsYears} onChange={e => setMainsYears(e.target.value)} placeholder="2021, 2022, 2023" />
          </div>
          <div className="space-y-2">
            <Label>Interview Years (comma-separated)</Label>
            <Input value={interviewYears} onChange={e => setInterviewYears(e.target.value)} placeholder="2023" />
          </div>
        </div>

        <Button onClick={handleSave}>Save Changes</Button>
      </CardContent>
    </Card>
  );
}
