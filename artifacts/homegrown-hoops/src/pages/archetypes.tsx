import { Link } from "wouter";
import {
  Anchor, Wind, Activity, Target, Mountain, Flame, Compass,
  ChevronRight, Zap, Shield, Castle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Archetype catalogue data ─────────────────────────────────────────────────
const UNCHARTED = {
  id: "Uncharted",
  label: "Uncharted",
  icon: Compass,
  description:
    "Your story has not been written yet — step on the court and let your game speak",
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
  comingSoon?: true;
};

const ARCHETYPES: ArchetypeData[] = [
  {
    id: "The Mainstay",
    label: "The Mainstay",
    icon: Anchor,
    tagline: "The go-to scorer — when points are needed this player delivers consistently",
    requirement: "Earned when your scoring score (PPG × 10) reaches 150+ and you have the highest scoring score on your team.",
    accent: "#60A5FA",
    gradient: ["#0D1B2E", "#1A3355", "#0D1B2E"],
  },
  {
    id: "The Voltage",
    label: "The Voltage",
    icon: Flame,
    tagline: "An elite scorer who creates their own shot and puts up big numbers every night",
    requirement: "Earned when your scoring score (PPG × 10) reaches 150+ but another player on your team has an even higher scoring score.",
    accent: "#FBBF24",
    gradient: ["#2E1E00", "#55380A", "#2E1E00"],
  },
  {
    id: "The Engine",
    label: "The Engine",
    icon: Zap,
    tagline: "Does everything — scoring rebounding and playmaking at a high level. The team runs through this player",
    requirement: "Earned with a scoring score of 120–149 combined with a rebounding score above 75 or a playmaking score above 60.",
    accent: "#FB7185",
    gradient: ["#2E0A12", "#55101F", "#2E0A12"],
  },
  {
    id: "The Vortex",
    label: "The Vortex",
    icon: Wind,
    tagline: "Rebounds are this player's signature — they control the glass on both ends",
    requirement: "Earned when your rebounding score (RPG × 15) leads your team and reaches 75+.",
    accent: "#A78BFA",
    gradient: ["#160D2E", "#2D1A55", "#160D2E"],
  },
  {
    id: "The Current",
    label: "The Current",
    icon: Activity,
    tagline: "A natural playmaker whose passing defines how this team moves the ball",
    requirement: "Earned when your playmaking score (APG × 20) leads your team and reaches 75+.",
    accent: "#22D3EE",
    gradient: ["#0A1E2E", "#0F3A45", "#0A1E2E"],
  },
  {
    id: "The Warden",
    label: "The Warden",
    icon: Shield,
    tagline: "Steals are this player's weapon — they make life difficult for every ball handler",
    requirement: "Earned when your steals score (SPG × 35) leads your team and reaches 52+.",
    accent: "#8B5CF6",
    gradient: ["#160D2E", "#2D1A55", "#160D2E"],
  },
  {
    id: "The Wall",
    label: "The Wall",
    icon: Castle,
    tagline: "Shot blocking defines this player — they protect the paint and alter shots",
    requirement: "Earned when your blocks score (BPG × 35) leads your team and reaches 35+.",
    accent: "#6366F1",
    gradient: ["#0D0D2E", "#1A1A55", "#0D0D2E"],
  },
  {
    id: "The Deep",
    label: "The Deep",
    icon: Target,
    tagline: "The three pointer is this player's signature weapon — range is their superpower",
    requirement: "Earned when your three-point score (3PM × 40) leads your team, reaches 60+, and you average at least 1.5 three pointers per game.",
    accent: "#FB923C",
    gradient: ["#2E1008", "#551E0A", "#2E1008"],
  },
  {
    id: "The Climb",
    label: "The Climb",
    icon: Mountain,
    tagline: "Still writing their story — consistent contributor whose best games lie ahead",
    requirement: "Earned when no single stat category stands out enough to earn a named archetype — every player starts here.",
    accent: "#34D399",
    gradient: ["#0A2218", "#0F3D2A", "#0A2218"],
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
  const muted = arch.comingSoon;

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden h-full transition-transform duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
      style={{
        background: `linear-gradient(160deg, ${g0} 0%, ${g1} 50%, ${g2} 100%)`,
        border: `1px solid ${muted ? "rgba(100,116,139,0.18)" : arch.accent + "28"}`,
        boxShadow: `0 0 32px ${arch.accent}0a`,
        opacity: muted ? 0.72 : 1,
      }}
    >
      {/* Colour strip */}
      <div className="h-1 w-full" style={{ background: muted ? "rgba(100,116,139,0.3)" : `linear-gradient(to right, ${arch.accent}, ${arch.accent}44)` }} />

      {/* Coming Soon badge */}
      {muted && (
        <div
          className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
          style={{ background: "rgba(100,116,139,0.15)", border: "1px solid rgba(100,116,139,0.25)", color: "#64748b" }}
        >
          Coming Soon
        </div>
      )}

      {/* Card body */}
      <div className="flex-1 flex flex-col p-5 gap-4">
        {/* Header row */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: muted ? "rgba(100,116,139,0.08)" : `${arch.accent}14`,
              border: `1px solid ${muted ? "rgba(100,116,139,0.2)" : arch.accent + "38"}`,
              boxShadow: `0 0 16px ${arch.accent}12`,
            }}
          >
            <Icon className="w-6 h-6" style={{ color: muted ? "#64748b" : arch.accent }} strokeWidth={1.75} />
          </div>

          {/* Name + tagline */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: "1.3rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: muted ? "#64748b" : "#fff",
                lineHeight: 1.1,
              }}
            >
              {arch.label}
            </h3>
            <p
              className="mt-1 leading-snug"
              style={{ fontSize: "11px", color: muted ? "rgba(100,116,139,0.7)" : `${arch.accent}bb`, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
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
          Every player has an identity. Play enough games, earn enough stats, and yours reveals itself. Nine paths. Which one is yours?
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

      {/* Eight earnable archetypes */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
            Earnable Archetypes
          </p>
          <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
          <span className="text-[10px] font-bold text-muted-foreground">{ARCHETYPES.length} paths</span>
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
