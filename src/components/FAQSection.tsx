import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What is UPSC Connect and how does it work?",
    a: "UPSC Connect is a 1-on-1 mentorship platform for UPSC Civil Services aspirants. You browse verified mentors (toppers, interview-stage candidates, and subject experts), pick a slot that suits you, pay securely, and join a private online session via Google Meet or Jitsi. You can also chat with a mentor for free before booking.",
  },
  {
    q: "Who are the mentors on UPSC Connect?",
    a: "Every mentor is manually verified by our team before being listed. They include UPSC toppers with confirmed AIR, candidates who have appeared in the Personality Test, and experienced subject experts for Polity, GS, CSAT, Essay, and popular optional subjects. Their profile shows attempts, optional subject, languages, and areas of expertise.",
  },
  {
    q: "How much does a mentorship session cost?",
    a: "Each mentor sets their own per-session price, which is shown transparently on their profile before you book. Sessions with serving officers are offered free of cost. There are no hidden charges, packages, or auto-renewals — you pay only for the session you book.",
  },
  {
    q: "Can I get help for Prelims, Mains, and the Interview?",
    a: "Yes. You can find mentors for every stage of the exam: foundation and Prelims strategy, Mains answer writing and optional subject guidance, Essay structuring, and Personality Test preparation including DAF-based mock interviews.",
  },
  {
    q: "What happens if a mentor has no slots available?",
    a: "You can use the 'Request a Slot' option on the mentor's profile to propose a date and time that works for you. The mentor receives the request and can confirm, suggest an alternative, or decline. Requests automatically expire after a set window so your money is never stuck.",
  },
  {
    q: "Is the free chat with a mentor really free?",
    a: "Yes. The 'Talk to a Mentor (Free)' option lets you send a message about your strategy, optional choice, or daily routine and typically receive a thoughtful, human reply within ten minutes. No payment is required and no credit card is asked for.",
  },
  {
    q: "How are payments handled and are refunds possible?",
    a: "Payments are processed securely through Razorpay, India's leading payment gateway. If a mentor cannot conduct a confirmed session, the booking is cancelled and refunded as per our policy. For any payment issue, write to admin@upscconnect.in and our team will help.",
  },
  {
    q: "Do I need to install any app to attend a session?",
    a: "No. Sessions run on Google Meet or Jitsi directly in your browser. After your booking is confirmed, you receive a unique meeting link and a private passcode by email and inside your dashboard. Just click the link at your scheduled time.",
  },
];

const FAQSection = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  };

  return (
    <section className="px-4 sm:px-6 py-10 sm:py-14 max-w-3xl mx-auto">
      <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center mb-3">
        Frequently Asked Questions
      </h2>
      <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        Quick answers to the most common questions about UPSC Connect mentorship.
      </p>

      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left font-display text-base sm:text-lg font-semibold text-foreground">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
};

export default FAQSection;
