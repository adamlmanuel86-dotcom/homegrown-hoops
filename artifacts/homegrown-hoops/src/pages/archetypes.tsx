import { Link } from "wouter";
import {
  Anchor, Wind, Zap, Target, Mountain, Flame, Compass,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Archetype catalogue data ─────────────────────────────────────────────────
const UNCHARTED = {
  id: "Uncharted",
  label: "Uncharted",
  icon: Compass,
  description:
    "Your story hasn't been written yet. Play games, earn stats, and discover who you are on the court. This is where every player begins.",
  accent: "#94A3B8",
  gradient: ["#0A0C10", "#0F1520", "#0A0C10"],
};

type ArchetypeData = {
  id: string;
  label: string;
  icon: LucideIcon;
  tagline: string;
  requirement: string;
  accent: string;
  gradient: [string, string, string];
};

const ARCHETYPES: ArchetypeData[] = [
  {
    id: "The Mainstay",
    label: "The Mainstay",
    icon: Anchor,
    tagline: "Consistent points scorer.",
    requirement: "Earned by averaging the highest points per game on your team across the season.",
    accent: "#60A5FA",
    gradient: ["#0D1B2E", "#1A3355", "#0D1B2E"],
  },
  {
    id: "The Vortex",
    label: "The Vortex",
    icon: Wind,
    tagline: "Rebounds dominant.",
    requirement: "Earned by leading your team in total rebounds for the season.",
    accent: "#A78BFA",
    gradient: ["#160D2E", "#2D1A55", "#160D2E"],
  },
  {
    id: "The Current",
    label: "The Current",
    icon: Zap,
    tagline: "Assists and playmaking.",
    requirement: "Earned by leading your team in total assists for the season.",
    accent: "#22D3EE",
    gradient: ["#0A1E2E", "#0F3A45", "#0A1E2E"],
  },
  {
    id: "The Distance",
    label: "The Distance",
    icon: Target,
    tagline: "Three point specialist.",
    requirement: "Earned by making the most three pointers on your team for the season.",
    accent: "#FB923C",
    gradient: ["#2E1008", "#551E0A", "#2E1008"],
  },
  {
    id: "The Climb",
    label: "The Climb",
    icon: Mountain,
    tagline: "Improving across points and rebounds.",
    requirement: "Earned by showing the biggest statistical improvement from the first half to the second half of the season.",
    accent: "#34D399",
    gradient: ["#0A2218", "#0F3D2A", "#0A2218"],
  },
  {
    id: "The Spark",
    label: "The Spark",
    icon: Flame,
    tagline: "Changes the game in limited minutes.",
    requirement: "Earned by having the highest points per minute ratio on the team among players averaging under 15 minutes per game.",
    accent: "#F472B6",
    gradient: ["#2E0A1A", "#551030", "#2E0A1A"],
  },
];

// ─── Uncharted card ────────────────────────────────────────────────────────────
function UnchartedCard() {
  const Icon = UNCHARTED.icon;
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden p-8 flex flex-col items-center text-center"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, #1a2236 0%, #0a0c10 60%, #060810 100%)`,
        border: "1px solid rgba(148,163,184,0.15)",
        boxShadow: "0 0 60px rgba(148,163,184,0.04), inset 0 1px 0 rgba(148,163,184,0.08)",
      }}
    >
      {/* Starfield dots */}
      {[...Array(18)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-30"
          style={{
            width: i % 3 === 0 ? 2 : 1,
            height: i % 3 === 0 ? 2 : 1,
            background: "#94A3B8",
            top: `${10 + (i * 37) % 75}%`,
            left: `${5 + (i * 53) % 90}%`,
          }}
        />
      ))}

      {/* Default badge */}
      <div
        className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
        style={{ background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)", color: "#94A3B8" }}
      >
        New Player Default
      </div>

      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mt-2"
        style={{
          background: "rgba(148,163,184,0.06)",
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 0 30px rgba(148,163,184,0.06)",
        }}
      >
        <Icon className="w-10 h-10" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
      </div>

      {/* Name */}
      <h2
        className="mb-3"
        style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: "2.5rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#94A3B8",
        }}
      >
        Uncharted
      </h2>

      {/* Description */}
      <p
        className="leading-relaxed max-w-md"
        style={{ fontSize: "15px", color: "rgba(148,163,184,0.65)", lineHeight: 1.7 }}
      >
        {UNCHARTED.description}
      </p>
    </div>
  );
}

// ─── Regular archetype card ────────────────────────────────────────────────────
function ArchetypeCard({ arch }: { arch: ArchetypeData }) {
  const Icon = arch.icon;
  const [g0, g1, g2] = arch.gradient;

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden h-full transition-transform duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
      style={{
        background: `linear-gradient(160deg, ${g0} 0%, ${g1} 50%, ${g2} 100%)`,
        border: `1px solid ${arch.accent}28`,
        boxShadow: `0 0 32px ${arch.accent}0a`,
      }}
    >
      {/* Colour strip */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${arch.accent}, ${arch.accent}44)` }} />

      {/* Card body */}
      <div className="flex-1 flex flex-col p-5 gap-4">
        {/* Header row */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${arch.accent}14`,
              border: `1px solid ${arch.accent}38`,
              boxShadow: `0 0 16px ${arch.accent}12`,
            }}
          >
            <Icon className="w-6 h-6" style={{ color: arch.accent }} strokeWidth={1.75} />
          </div>

          {/* Name + tagline */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: "1.3rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#fff",
                lineHeight: 1.1,
              }}
            >
              {arch.label}
            </h3>
            <p
              className="mt-1 leading-snug"
              style={{ fontSize: "11px", color: `${arch.accent}bb`, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
            >
              {arch.tagline}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: `${arch.accent}18` }} />

        {/* Requirement */}
        <div className="flex-1">
          <p
            className="mb-2"
            style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: `${arch.accent}77` }}
          >
            Earn this archetype
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
            {arch.requirement}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function ArchetypesPage() {
  return (
    <div className="space-y-10 max-w-2xl mx-auto pb-8">
      {/* Page header */}
      <div className="space-y-2 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">
          Player Identity
        </p>
        <h1
          className="text-foreground leading-none"
          style={{ fontFamily: "'Anton', sans-serif", fontSize: "3rem", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          Archetypes
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
          Every player has an identity. Play enough games, earn enough stats, and yours reveals itself. Seven paths. Which one is yours?
        </p>
      </div>

      {/* Uncharted — full width featured card */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Starting Point
          </p>
          <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/20 to-transparent" />
        </div>
        <UnchartedCard />
      </section>

      {/* Six earnable archetypes */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
            Earnable Archetypes
          </p>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
          <span className="text-[10px] font-bold text-muted-foreground">6 paths</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ARCHETYPES.map((arch) => (
            <ArchetypeCard key={arch.id} arch={arch} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <div
        className="rounded-2xl p-6 text-center space-y-3"
        style={{ background: "hsl(220 36% 10%)", border: "1px solid hsl(220 28% 16%)" }}
      >
        <p
          style={{ fontFamily: "'Anton', sans-serif", fontSize: "1.2rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}
        >
          Your archetype is earned, not chosen.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Archetypes are assigned automatically based on your stats. Play your game and your identity will find you.
        </p>
        <Link
          href="/players"
          className="inline-flex items-center gap-2 text-primary font-bold text-sm mt-1 hover:underline"
        >
          Browse Players <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
