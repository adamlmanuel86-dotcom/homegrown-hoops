import { CourtPresenceLogo } from "@/components/logo";

const paragraphs = [
  "Court Presence is a youth basketball platform that recognizes every player's contribution — the scorer, the defender, the playmaker, the bench player who changes the game in four minutes. Every player earns their Court Presence through real performance on the court.",
  "The best teams need every role filled. Court Presence was built to recognize all of them.",
  "Every game filmed and uploaded to the platform. Every point, rebound and assist tracked and displayed on your own player profile.",
  "Earn Stamps for standout performances. Earn your Archetype — are you The Current? The Vortex? The Mainstay? Every player starts Uncharted and earns their identity through real performance.",
  "At the end of every season the best performers earn Tides — the highest honours on the platform. The Crest goes to one player. Will it be you?",
  "Your Legacy Score grows every game and never resets. It's your basketball story told in one number.",
  "Share your player card. Show your Stamps. Own your legacy.",
  "We're just getting started — and so are you.",
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
              text === "We're just getting started — and so are you."
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
          <CourtPresenceLogo size="lg" />
        </div>
        <p
          className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-foreground"
          style={{ fontFamily: "'Anton', sans-serif" }}
        >
          Your Game.{" "}
          <span className="text-primary">Your Story.</span>{" "}
          Your Court Presence.
        </p>
      </div>
    </div>
  );
}
