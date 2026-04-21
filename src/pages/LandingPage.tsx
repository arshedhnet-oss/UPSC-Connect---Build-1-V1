import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Calendar, ArrowRight, Building2, CircleCheck, MessageCircle, GraduationCap, CalendarCheck } from "lucide-react";
import { ENABLE_ORGANISATIONS } from "@/lib/featureFlags";
import Navbar from "@/components/Navbar";
import FreeChatModal from "@/components/chat/FreeChatModal";
import BookFreeSessionModal from "@/components/BookFreeSessionModal";
import ToppersSection from "@/components/ToppersSection";
import MentorshipStickyBar from "@/components/MentorshipStickyBar";
import MentorshipProgrammeCard from "@/components/MentorshipProgrammeCard";
import MentorshipFloatingCTA from "@/components/MentorshipFloatingCTA";
import FAQSection from "@/components/FAQSection";

const LandingPage = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open booking modal after returning from signup/login with intent
  useEffect(() => {
    if (searchParams.get("openFreeBooking") === "1") {
      setBookOpen(true);
      searchParams.delete("openFreeBooking");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-background">
      <MentorshipStickyBar />
      <Navbar />
      <FreeChatModal open={chatOpen} onOpenChange={setChatOpen} />
      <BookFreeSessionModal open={bookOpen} onOpenChange={setBookOpen} />

      {/* Hero */}
      <section className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto text-center">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight animate-fade-in">
          Book 1-on-1 Mentorship<br className="hidden sm:block" /> with UPSC Toppers
        </h1>
        <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Connect with experienced mentors for personalized guidance on your UPSC preparation journey. Book sessions, get expert advice, and crack the exam.
        </p>
        {/* Primary CTA - Talk to Mentor */}
        <div className="mt-6 sm:mt-8 flex flex-col items-center animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="relative">
            <Button size="lg" onClick={() => setChatOpen(true)} className="group relative overflow-hidden rounded-full px-8 sm:px-10 py-6 text-base font-semibold border-0 bg-[hsl(28,100%,50%)] hover:bg-[hsl(28,100%,45%)] text-white shadow-lg shadow-[hsl(28,100%,50%)/0.3] transition-all duration-300 hover:shadow-xl hover:shadow-[hsl(28,100%,50%)/0.4] hover:scale-[1.05]">
              <span className="relative z-10 flex items-center gap-2.5">
                <span className="relative flex items-center justify-center h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm">
                  <MessageCircle className="h-4 w-4 text-white fill-white/40" />
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[hsl(28,100%,50%)] animate-pulse" />
                </span>
                Talk to a Mentor (Free)
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">⚡ Get a reply in 10 minutes</p>
          <Button
            size="lg"
            onClick={() => setBookOpen(true)}
            className="mt-4 group relative overflow-hidden rounded-full px-8 sm:px-10 py-6 text-base font-semibold border-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.05] animate-[pulse-glow-orange_2s_ease-in-out_infinite]"
          >
            <span className="relative z-10 flex items-center gap-2.5">
              <CalendarCheck className="h-4 w-4" />
              Book a Free 1:1 Session
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Button>
        </div>

        {/* Secondary CTAs */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <Button size="lg" asChild>
            <Link to="/mentors">Browse Mentors <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          {ENABLE_ORGANISATIONS && (
            <Button size="lg" variant="outline" asChild>
              <Link to="/organisations"><Building2 className="mr-2 h-4 w-4" /> Browse Organisations</Link>
            </Button>
          )}
        </div>
        {/* Mentor CTA */}
        <div className="mt-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Link
            to="/mentor-onboarding"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <GraduationCap className="h-4 w-4" />
            Are you a UPSC Mentor? <span className="underline underline-offset-2">Apply here</span>
          </Link>
        </div>
        {ENABLE_ORGANISATIONS && (
          <div className="mt-3 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <Link to="/organisations/register"><Building2 className="mr-2 h-4 w-4" /> Register Your Institute</Link>
            </Button>
          </div>
        )}
      </section>

      <MentorshipProgrammeCard />

      <ToppersSection />

      {ENABLE_ORGANISATIONS && (
        <section className="px-4 sm:px-6 py-8 sm:py-12 bg-card">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">For Coaching Institutes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Register your organisation, list your mentors, and manage sessions — all in one platform.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 mb-8">
              {[
              { icon: Building2, title: "Dedicated Profile", desc: "Get a branded page for your institute with mentor listings and contact info." },
              { icon: Users, title: "Mentor Management", desc: "Add, approve, and manage mentors under your organisation seamlessly." },
              { icon: Calendar, title: "Session Control", desc: "Set pricing, manage bookings, and track all sessions from your dashboard." }].
              map((f, i) =>
              <div key={i} className="rounded-lg border border-border bg-background p-5 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <f.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link to="/organisations">Browse Organisations</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/organisations/register">Register Your Institute</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* About / Detailed Features */}
      <section className="px-4 sm:px-6 py-10 sm:py-14 bg-muted/30 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
            Built for Serious UPSC Aspirants
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            UPSC Connect is a focused mentorship platform that bridges the gap between aspirants and the people who have already cracked the Civil Services Examination. Every feature is designed around one goal: helping you prepare smarter, stay consistent, and walk into the exam hall with clarity.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 mb-8 sm:mb-10">
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">Verified Mentors, Not Anonymous Coaches</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every mentor on the platform is a UPSC topper, interview-stage candidate, or domain expert whose credentials we verify before approval. You see their AIR, attempts, optional subject, languages, and subjects of expertise upfront, so you can choose someone whose journey mirrors yours.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">Personalised 1-on-1 Guidance</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Group coaching gives generic advice. We give you a private session with a mentor who reviews your specific situation: your background, available time, weak areas, optional subject, and answer-writing style. Every session ends with a concrete action plan.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">Stage-Specific Strategy: Prelims, Mains & Interview</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Whether you are starting your foundation, refining a Mains answer-writing approach, polishing your DAF for the Personality Test, or recovering after a setback, you can pick a mentor who has lived that exact stage and understands what genuinely moves the needle.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">Transparent Pricing & Instant Booking</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No hidden packages, no upselling. Each mentor sets their own per-session price, you see availability in real time, pay securely, and receive your meeting link instantly. Sessions are conducted on Google Meet or Jitsi with a private passcode.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">Free Doubt Chat with a Mentor</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Not ready to book yet? Use our free chat to ask a mentor a quick question about your strategy, optional choice, or daily routine. You typically get a thoughtful, human reply within ten minutes, no payment required.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">A Community That Learns Together</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Beyond 1-on-1 sessions, our Community space lets aspirants share writeups, model answers, and preparation notes, and discuss them with peers and mentors, so collective wisdom compounds over the long preparation cycle.
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed">
            UPSC preparation is a long, often lonely journey. The right mentor at the right moment can save you months of wasted effort, course-correct your strategy, and rebuild your confidence after a tough attempt. UPSC Connect exists so that every aspirant, regardless of city, coaching access, or budget, can sit across the table with someone who has already walked the path.
          </p>
        </div>
      </section>

      <FAQSection />

      {/* Contact */}
      <section className="px-4 sm:px-6 py-8 sm:py-12 max-w-4xl mx-auto text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">Contact Us</h2>
        <p className="text-muted-foreground mb-2">Get in touch with us</p>
        <a href="mailto:admin@upscconnect.in" className="text-primary font-medium hover:underline">
          admin@upscconnect.in
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-4xl mx-auto space-y-3">
          <div>
            <Link
              to="/mentor-onboarding"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <GraduationCap className="h-4 w-4" />
              Are you a UPSC Mentor? <span className="underline underline-offset-2">Apply here</span>
            </Link>
          </div>
          <p>© 2026 UPSC Connect. All rights reserved.</p>
        </div>
      </footer>
      <MentorshipFloatingCTA />
    </div>
  );
};

export default LandingPage;
