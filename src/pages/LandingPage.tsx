import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Calendar, ArrowRight, Building2, CircleCheck, MessageCircle, GraduationCap } from "lucide-react";
import { ENABLE_ORGANISATIONS } from "@/lib/featureFlags";
import Navbar from "@/components/Navbar";
import FreeChatModal from "@/components/chat/FreeChatModal";
import ToppersSection from "@/components/ToppersSection";
import MentorshipStickyBar from "@/components/MentorshipStickyBar";
import MentorshipProgrammeCard from "@/components/MentorshipProgrammeCard";
import MentorshipFloatingCTA from "@/components/MentorshipFloatingCTA";
import FAQSection from "@/components/FAQSection";

const LandingPage = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <MentorshipStickyBar />
      <Navbar />
      <FreeChatModal open={chatOpen} onOpenChange={setChatOpen} />

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
            <Button size="lg" onClick={() => setChatOpen(true)} className="group relative overflow-hidden rounded-full px-8 sm:px-10 py-6 text-base font-semibold border-0 bg-[hsl(28,100%,50%)] hover:bg-[hsl(28,100%,45%)] text-white shadow-lg shadow-[hsl(28,100%,50%)/0.3] transition-all duration-300 hover:shadow-xl hover:shadow-[hsl(28,100%,50%)/0.4] hover:scale-[1.05] animate-[pulse-glow-orange_2s_ease-in-out_infinite]">
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

      {/* How It Works */}
      <section id="how-it-works" className="px-4 sm:px-6 py-8 sm:py-14 max-w-4xl mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
          How UPSC Connect Works
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          Preparing for the UPSC Civil Services Examination can be overwhelming. UPSC Connect simplifies your journey by giving you direct access to experienced mentors who have been through the process themselves.
        </p>

        <div className="space-y-6 sm:space-y-8">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">1</span>
              <h3 className="font-display text-xl font-semibold text-card-foreground">Explore Verified UPSC Mentors</h3>
            </div>
            <p className="text-muted-foreground mb-3">Browse through a curated list of mentors, including UPSC aspirants, interview candidates, and subject experts.</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> View detailed mentor profiles</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Check subject expertise (Polity, GS, Optional subjects, etc.)</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Compare experience, pricing, and session formats</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-foreground">Choose a mentor based on your preparation stage and specific needs.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">2</span>
              <h3 className="font-display text-xl font-semibold text-card-foreground">Book a 1-on-1 Session</h3>
            </div>
            <p className="text-muted-foreground mb-3">Select a convenient time slot and book your session instantly.</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Flexible scheduling options</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Transparent pricing</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Secure online payment</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-foreground">Get direct access to mentors without any intermediaries.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">3</span>
              <h3 className="font-display text-xl font-semibold text-card-foreground">Attend Your Mentorship Session</h3>
            </div>
            <p className="text-muted-foreground mb-3">Join your session through a secure online meeting link.</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Discuss preparation strategy and study plans</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Get personalized feedback on your approach</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Clarify doubts in real time</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-foreground">Focus on targeted guidance instead of generic coaching.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">4</span>
              <h3 className="font-display text-xl font-semibold text-card-foreground">Improve with Personalized Guidance</h3>
            </div>
            <p className="text-muted-foreground mb-3">Apply the mentor's advice to strengthen your preparation.</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Refine your study strategy</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Improve answer writing and conceptual clarity</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Stay consistent and accountable</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-foreground">Small improvements over time lead to better performance in the exam.</p>
          </div>
        </div>

        {/* Why UPSC Connect */}
        <div className="mt-8 sm:mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">Why UPSC Connect?</h3>
          <ul className="space-y-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto text-left">
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Direct access to experienced UPSC mentors</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Affordable and flexible 1-on-1 sessions</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Personalized guidance tailored to your needs</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Built specifically for serious UPSC aspirants</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 sm:mt-10 text-center">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">Start Your UPSC Journey Today</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Whether you are preparing for Prelims, Mains, or Interview, the right mentorship can make a significant difference. Browse mentors and book your first session today.
          </p>
          <Button size="lg" asChild>
            <Link to="/mentors">Browse Mentors <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

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
