import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CircleCheck } from "lucide-react";
import Navbar from "@/components/Navbar";

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section id="how-it-works" className="px-4 sm:px-6 py-8 sm:py-14 max-w-4xl mx-auto">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
          How UPSC Connect Works
        </h1>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          Preparing for the UPSC Civil Services Examination can be overwhelming. UPSC Connect simplifies your journey by giving you direct access to experienced mentors who have been through the process themselves.
        </p>

        <div className="space-y-6 sm:space-y-8">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">1</span>
              <h2 className="font-display text-xl font-semibold text-card-foreground">Explore Verified UPSC Mentors</h2>
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
              <h2 className="font-display text-xl font-semibold text-card-foreground">Book a 1-on-1 Session</h2>
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
              <h2 className="font-display text-xl font-semibold text-card-foreground">Attend Your Mentorship Session</h2>
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
              <h2 className="font-display text-xl font-semibold text-card-foreground">Improve with Personalized Guidance</h2>
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
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">Why UPSC Connect?</h2>
          <ul className="space-y-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto text-left">
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Direct access to experienced UPSC mentors</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Affordable and flexible 1-on-1 sessions</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Personalized guidance tailored to your needs</li>
            <li className="flex items-start gap-2"><CircleCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" /> Built specifically for serious UPSC aspirants</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 sm:mt-10 text-center">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3">Start Your UPSC Journey Today</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Whether you are preparing for Prelims, Mains, or Interview, the right mentorship can make a significant difference. Browse mentors and book your first session today.
          </p>
          <Button size="lg" asChild>
            <Link to="/mentors">Browse Mentors <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
