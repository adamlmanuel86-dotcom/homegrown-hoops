import { HomegrownHoopsLogo } from "@/components/logo";

const paragraphs = [
  "Homegrown Hoops started the way most good things do — on a gym floor, watching a kid who loves the game.",
  "We built this platform because Atlantic Canada produces real basketball talent. Kids who work hard, compete with heart, and deserve to be seen. But for too long the tools to track that talent, celebrate those moments, and build those legacies only existed for players at the highest levels.",
  "We're changing that.",
  "Homegrown Hoops uses AI technology to do something simple — make sure every bucket counts, every assist gets credited, and every player who puts in the work gets recognized for it.",
  "This isn't a business idea dressed up as a passion project. It started with a father, two sons, and a genuine love for what basketball does for young people. It builds confidence. It teaches resilience. It gives kids something to be proud of.",
  "Atlantic Canada's game deserves its own platform. This is it.",
];

export function OurStoryPage() {
  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="mb-12 pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">
          About Us
        </p>
        <h1
          className="text-5xl sm:text-6xl font-black uppercase leading-none tracking-tight text-foreground"
          style={{ fontFamily: "'Anton', sans-serif" }}
        >
          Our Story
        </h1>
        <div className="mt-5 h-px bg-gradient-to-r from-primary via-primary/30 to-transparent" />
      </div>

      {/* ── Body copy ──────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {paragraphs.map((text, i) => (
          <p
            key={i}
            className={`leading-relaxed ${
              text === "We're changing that."
                ? "text-xl font-bold text-primary"
                : "text-[1.0625rem] text-foreground/85"
            }`}
          >
            {text}
          </p>
        ))}
      </div>

      {/* ── Closing tagline ─────────────────────────────────────────────────── */}
      <div className="mt-16 rounded-2xl bg-card border border-white/5 p-8 text-center shadow-xl">
        <div className="flex justify-center mb-5">
          <HomegrownHoopsLogo size="lg" />
        </div>
        <p
          className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-foreground"
          style={{ fontFamily: "'Anton', sans-serif" }}
        >
          Your Game.{" "}
          <span className="text-primary">Your Stats.</span>{" "}
          Your Legacy.
        </p>
      </div>
    </div>
  );
}
