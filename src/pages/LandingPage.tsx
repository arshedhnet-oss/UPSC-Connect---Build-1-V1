import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Calendar, ArrowRight, Building2, CircleCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import FreeChatModal from "@/components/chat/FreeChatModal";

const LandingPage = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <FreeChatModal open={chatOpen} onOpenChange={setChatOpen} />

      {/* Hero */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 max-w-4xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight animate-fade-in">
          Book 1-on-1 Mentorship<br className="hidden sm:block" /> with UPSC Toppers
        </h2>
        <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Connect with experienced mentors for personalized guidance on your UPSC preparation journey. Book sessions, get expert advice, and crack the exam.
        </p>
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Button size="lg" asChild>
            <Link to="/mentors">Browse Mentors <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/organisations"><Building2 className="mr-2 h-4 w-4" /> Browse Organisations</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button size="lg" onClick={() => setChatOpen(true)} className="group relative overflow-hidden rounded-full px-8 border-0 bg-gradient-to-r from-primary via-primary/85 to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.03]">
              <span className="relative z-10 flex items-center gap-2 text-muted">
                <span className="inline-block transition-transform duration-300 group-hover:rotate-12">🧭</span>
                Feeling Lost? Talk to a Mentor
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
            <Link to="/organisations/register"><Building2 className="mr-2 h-4 w-4" /> Register Your Institute</Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 sm:px-6 py-12 sm:py-20 max-w-4xl mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
          How UPSC Connect Works
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          Preparing for the UPSC Civil Services Examination can be overwhelming. UPSC Connect simplifies your journey by giving you direct access to experienced mentors who have been through the process themselves.
        </p>

        <div className="space-y-8 sm:space-y-10">
          {/* Step 1 */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">1</span>
              <h3 className="font-display text-xl font-semibold text-card-foreground">Explore Verified UPSC Mentors</h3>
            </div>
            <p className="text-muted-foreground mb-3">
              Browse through a curated list of mentors, including UPSC aspirants, interview candidates, and subject experts.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> View detailed mentor profiles</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Check subject expertise (Polity, GS, Optional subjects, etc.)</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Compare experience, pricing, and session formats</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-foreground">
              Choose a mentor based on your preparation stage and specific needs.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">2</span>
              <h3 className="font-display text-xl font-semibold text-card-foreground">Book a 1-on-1 Session</h3>
            </div>
            <p className="text-muted-foreground mb-3">
              Select a convenient time slot and book your session instantly.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Flexible scheduling options</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Transparent pricing</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Secure online payment</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-foreground">
              Get direct access to mentors without any intermediaries.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">3</span>
              <h3 className="font-display text-xl font-semibold text-card-foreground">Attend Your Mentorship Session</h3>
            </div>
            <p className="text-muted-foreground mb-3">
              Join your session through a secure online meeting link.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Discuss preparation strategy and study plans</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Get personalized feedback on your approach</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Clarify doubts in real time</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-foreground">
              Focus on targeted guidance instead of generic coaching.
            </p>
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">4</span>
              <h3 className="font-display text-xl font-semibold text-card-foreground">Improve with Personalized Guidance</h3>
            </div>
            <p className="text-muted-foreground mb-3">
              Apply the mentor's advice to strengthen your preparation.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Refine your study strategy</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Improve answer writing and conceptual clarity</li>
              <li className="flex items-start gap-2"><CircleCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Stay consistent and accountable</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-foreground">
              Small improvements over time lead to better performance in the exam.
            </p>
          </div>
        </div>

        {/* Why UPSC Connect */}
        <div className="mt-12 sm:mt-16 rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">Why UPSC Connect?</h3>
          <ul className="space-y-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto text-left">
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Direct access to experienced UPSC mentors</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Affordable and flexible 1-on-1 sessions</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Personalized guidance tailored to your needs</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Built specifically for serious UPSC aspirants</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-10 sm:mt-14 text-center">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">Start Your UPSC Journey Today</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Whether you are preparing for Prelims, Mains, or Interview, the right mentorship can make a significant difference. Browse mentors and book your first session today.
          </p>
          <Button size="lg" asChild>
            <Link to="/mentors">Browse Mentors <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Organisations */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 bg-card">
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

      {/* Contact */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">Contact Us</h2>
        <p className="text-muted-foreground mb-2">Get in touch with us</p>
        <a href="mailto:admin@upscconnect.in" className="text-primary font-medium hover:underline">
          admin@upscconnect.in
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        © 2026 UPSC Connect. All rights reserved.
      </footer>
    </div>);

};

export default LandingPage;