import { AspectRatio } from "@/components/ui/aspect-ratio";

const toppers = [
  { name: "Abhijit Asokan", air: 234, image: "/images/topper-1.jpg" },
  { name: "Ajina Jose", air: 669, image: "/images/topper-2.jpg" },
  { name: "Nithin Pradeep", air: 172, image: "/images/topper-3.jpg" },
];

const ToppersSection = () => {
  return (
    <section className="px-4 sm:px-6 py-12 sm:py-16 bg-muted/40">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
          Learn from those who've done it
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
          Connect with toppers and officers who've gone through the same journey.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {toppers.map((topper) => (
            <div
              key={topper.name}
              className="group rounded-xl overflow-hidden border border-border bg-card shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.03] hover:shadow-md"
            >
              <AspectRatio ratio={4 / 5}>
                <img
                  src={topper.image}
                  alt={`${topper.name} – AIR ${topper.air}`}
                  loading="lazy"
                  className="h-full w-full object-cover object-top"
                />
              </AspectRatio>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ToppersSection;
