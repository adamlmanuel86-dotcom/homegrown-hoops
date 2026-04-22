import { Link } from "wouter";
import {
  Anchor, Wind, Zap, Target, Mountain, Flame, Compass,
  BarChart2, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Archetype catalogue data ─────────────────────────────────────────────────
const UNCHARTED = {
  id: "Uncharted",
  label: "Uncharted",
  icon: Compass,
  tagline: "Your story hasn't been written yet.",
  description:
    "Your story hasn't been written yet. Play games, earn stats, and discover who you are on the court.",
  isDefault: true,
  accent: "#94A3B8",
  gradient: ["#0A0C10", "#0F1520", "#0A0C10"],
  requirements: null,
};

type ArchetypeData = {
  id: string;
  label: string;
  icon: LucideIcon;
  tagline: string;
  description: string;
  accent: string;
  gradient: [string, string, string];
  requirements: { icon: LucideIcon; text: string }[];
};

const ARCHETYPES: ArchetypeData[] = [
  {
    id: "The Mainstay",
    label: "The Mainstay",
    icon: Anchor,
    tagline: "Built for the long haul. Consistent, reliable, unshakeable.",
    description:
      "The Mainstay doesn't have off-nights. They show up every game and deliver, every time.",
    accent: "#60A5FA",
    gradient: ["#0D1B2E", "#1A3355", "#0D1B2E"],
    requirements: [
      { icon: BarChart2, text: "10+ points in 80% or more of games played in a season" },
      { icon: BarChart2, text: "Appear in at least 75% of all regular season games" },
      { icon: BarChart2, text: "Consistent double-figure scoring across the season" },
    ],
  },
  {
    id: "The Vortex",
    label: "The Vortex",
    icon: Wind,
    tagline: "Opponents can't find their footing. You create chaos.",
    description:
      "The Vortex disrupts everything in their path. Defence is their art form — offences break against them.",
    accent: "#A78BFA",
    gradient: ["#160D2E", "#2D1A55", "#160D2E"],
    requirements: [
      { icon: BarChart2, text: "Lead team in combined blocks + steals for the season" },
      { icon: BarChart2, text: "Average 4+ defensive plays (blocks + steals) per game" },
      { icon: BarChart2, text: "Rank top 3 in the league in total defensive stats" },
    ],
  },
  {
    id: "The Current",
    label: "The Current",
    icon: Zap,
    tagline: "Fast. Decisive. Always moving. Always in the right place.",
    description:
      "The Current sees the floor before anyone else does. They make the pass before the defence can react.",
    accent: "#22D3EE",
    gradient: ["#0A1E2E", "#0F3A45", "#0A1E2E"],
    requirements: [
      { icon: BarChart2, text: "Average 6+ assists per game for the season" },
      { icon: BarChart2, text: "Maintain a 3:1 or better assist-to-turnover ratio" },
      { icon: BarChart2, text: "Lead team in assists for the season" },
    ],
  },
  {
    id: "The Distance",
    label: "The Distance",
    icon: Target,
    tagline: "Range that respects no defence. Step back and let it fly.",
    description:
      "The Distance makes defences pay for every inch of space. No one covers the whole court.",
    accent: "#FB923C",
    gradient: ["#2E1008", "#551E0A", "#2E1008"],
    requirements: [
      { icon: BarChart2, text: "Average 2+ three-pointers made per game for the season" },
      { icon: BarChart2, text: "Shoot 35% or better from beyond the arc on the season" },
      { icon: BarChart2, text: "Attempt at least 4 three-pointers per game" },
    ],
  },
  {
    id: "The Climb",
    label: "The Climb",
    icon: Mountain,
    tagline: "Grinding upward every session. The ceiling hasn't been found.",
    description:
      "The Climb isn't about where you are — it's about trajectory. Nobody's improving faster.",
    accent: "#34D399",
    gradient: ["#0A2218", "#0F3D2A", "#0A2218"],
    requirements: [
      { icon: BarChart2, text: "Improve per-game scoring average by 25%+ from first to second half of season" },
      { icon: BarChart2, text: "Show statistical improvement in at least 2 categories over the season" },
      { icon: BarChart2, text: "Finish the season stronger than you started" },
    ],
  },
  {
    id: "The Spark",
    label: "The Spark",
    icon: Flame,
    tagline: "One play and the whole gym changes. You ignite it.",
    description:
      "The Spark doesn't always top the stat sheet — but they flip the energy of a game in a single play.",
    accent: "#F472B6",
    gradient: ["#2E0A1A", "#551030", "#2E0A1A"],
    requirements: [
      { icon: BarChart2, text: "Record 3 or more games with 20+ points in a single season" },
      { icon: BarChart2, text: "Post at least one 30+ point performance" },
      { icon: BarChart2, text: "Highest peak scoring game in the league" },
    ],
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
        className="text-white mb-2"
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

        {/* Requirements */}
        <div className="space-y-2 flex-1">
          <p
            style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: `${arch.accent}77` }}
          >
            Earn this archetype
          </p>
          <ul className="space-y-1.5">
            {arch.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: arch.accent }}
                />
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                  {req.text}
                </p>
              </li>
            ))}
          </ul>
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
        <p
          className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70"
        >
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
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Starting Point
          </p>
          <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/20 to-transparent" />
        </div>
        <UnchartedCard />
      </section>

      {/* Six earnable archetypes */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70"
          >
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

      {/* Footer call to action */}
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
          Archetypes are awarded by the league admin based on your season stats and performance. Play your game — your identity will follow.
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
