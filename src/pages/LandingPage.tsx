import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Calendar, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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
            <Link to="/signup">Become a Mentor</Link>
          </Button>
        </div>
        <div className="mt-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button size="lg" variant="secondary" className="rounded-full px-8 shadow-md" asChild>
            <Link to="/mentors">🧭 Feeling Lost? Talk to a Mentor</Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 sm:px-6 py-12 sm:py-16 max-w-5xl mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 sm:mb-10">How It Works</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            { icon: Users, title: "Expert Mentors", desc: "Learn from IAS/IPS officers and experienced educators who've been through the journey." },
            { icon: Calendar, title: "Flexible Scheduling", desc: "Book sessions at times that work for you. Choose from available mentor slots." },
            { icon: BookOpen, title: "All Subjects", desc: "Get guidance on GS, Optional subjects, Essay, Ethics, and Interview preparation." },
          ].map((f, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5 sm:p-6 text-center animate-fade-in" style={{ animationDelay: `${0.1 * (i + 3)}s` }}>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
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
    </div>
  );
};

export default LandingPage;
