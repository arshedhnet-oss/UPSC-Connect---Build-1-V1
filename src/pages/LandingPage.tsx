import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Calendar, ArrowRight, Building2, CircleCheck, MessageCircle } from "lucide-react";
import { ENABLE_ORGANISATIONS } from "@/lib/featureFlags";
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