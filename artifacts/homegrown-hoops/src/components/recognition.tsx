import {
  Hash, Square, Eye, Droplets, Target, RotateCcw, Zap, Clock,
  Waves, TrendingUp, Shield, Lightbulb, Activity, MapPin, Sparkles, Mountain,
  Anchor, Wind, Flame, Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Stamps ──────────────────────────────────────────────────────────────────
export const STAMPS: { id: string; label: string; icon: LucideIcon; color: string }[] = [
  { id: "double_digits", label: "Double Digits", icon: Hash,       color: "#F97316" },
  { id: "glass_work",    label: "Glass Work",    icon: Square,     color: "#FB923C" },
  { id: "goggles",       label: "Goggles",       icon: Eye,        color: "#FBBF24" },
  { id: "wet",           label: "Wet",           icon: Droplets,   color: "#38BDF8" },
  { id: "the_distance",  label: "The Distance",  icon: Target,     color: "#A78BFA" },
  { id: "second_chance", label: "Second Chance", icon: RotateCcw,  color: "#34D399" },
  { id: "full_send",     label: "Full Send",     icon: Zap,        color: "#F472B6" },
  { id: "shift_worker",  label: "Shift Worker",  icon: Clock,      color: "#60A5FA" },
];

// ─── Tides ───────────────────────────────────────────────────────────────────
export const TIDES: { id: string; label: string; icon: LucideIcon; color: string; glow: string }[] = [
  { id: "high_tide",     label: "High Tide",    icon: Waves,     color: "#38BDF8", glow: "rgba(56,189,248,0.25)" },
  { id: "rising_tide",   label: "Rising Tide",  icon: TrendingUp,color: "#34D399", glow: "rgba(52,211,153,0.25)" },
  { id: "the_keeper",    label: "The Keeper",   icon: Shield,    color: "#A78BFA", glow: "rgba(167,139,250,0.25)" },
  { id: "lighthouse",    label: "Lighthouse",   icon: Lightbulb, color: "#FBBF24", glow: "rgba(251,191,36,0.25)"  },
  { id: "the_swell",     label: "The Swell",    icon: Activity,  color: "#F97316", glow: "rgba(249,115,22,0.25)"  },
  { id: "shoreline",     label: "Shoreline",    icon: MapPin,    color: "#60A5FA", glow: "rgba(96,165,250,0.25)"  },
  { id: "the_source",    label: "The Source",   icon: Sparkles,  color: "#F472B6", glow: "rgba(244,114,182,0.25)" },
  { id: "the_crest",     label: "The Crest",    icon: Mountain,  color: "#FB923C", glow: "rgba(251,146,60,0.25)"  },
];

// ─── Archetypes ───────────────────────────────────────────────────────────────
export const ARCHETYPES: {
  id: string;
  label: string;
  icon: LucideIcon;
  tagline: string;
  gradient: string;
  accent: string;
}[] = [
  {
    id:       "The Mainstay",
    label:    "The Mainstay",
    icon:     Anchor,
    tagline:  "Built for the long haul. Consistent, reliable, unshakeable.",
    gradient: "from-blue-900/80 via-blue-800/60 to-blue-900/80",
    accent:   "#60A5FA",
  },
  {
    id:       "The Vortex",
    label:    "The Vortex",
    icon:     Wind,
    tagline:  "Opponents can't find their footing. You create chaos.",
    gradient: "from-purple-900/80 via-violet-800/60 to-purple-900/80",
    accent:   "#A78BFA",
  },
  {
    id:       "The Current",
    label:    "The Current",
    icon:     Zap,
    tagline:  "Fast. Decisive. Always moving. Always in the right place.",
    gradient: "from-cyan-900/80 via-teal-800/60 to-cyan-900/80",
    accent:   "#22D3EE",
  },
  {
    id:       "The Distance",
    label:    "The Distance",
    icon:     Target,
    tagline:  "Range that respects no defence. Step back and let it fly.",
    gradient: "from-orange-900/80 via-amber-800/60 to-orange-900/80",
    accent:   "#FB923C",
  },
  {
    id:       "The Climb",
    label:    "The Climb",
    icon:     Mountain,
    tagline:  "Grinding upward every session. The ceiling hasn't been found.",
    gradient: "from-emerald-900/80 via-green-800/60 to-emerald-900/80",
    accent:   "#34D399",
  },
  {
    id:       "The Spark",
    label:    "The Spark",
    icon:     Flame,
    tagline:  "One play and the whole gym changes. You ignite it.",
    gradient: "from-rose-900/80 via-red-800/60 to-rose-900/80",
    accent:   "#F472B6",
  },
];

// ─── Stamps section ───────────────────────────────────────────────────────────
export function StampsSection({ earned }: { earned: string[] }) {
  const earnedSet = new Set(earned);
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Recognition</p>
          <h2
            className="text-2xl font-black uppercase leading-none text-foreground"
            style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "0.04em" }}
          >
            Stamps
          </h2>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-primary/40 to-transparent ml-1" />
        <span className="text-xs font-bold text-muted-foreground">
          {earned.length}/{STAMPS.length}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-3">
        {STAMPS.map((stamp) => {
          const isEarned = earnedSet.has(stamp.id);
          const Icon = stamp.icon;
          return (
            <div key={stamp.id} className="flex flex-col items-center gap-1.5">
              {/* Badge circle */}
              <div
                className="relative w-14 h-14 rounded-full flex items-center justify-center"
                style={
                  isEarned
                    ? {
                        background: `radial-gradient(circle at 35% 35%, ${stamp.color}cc, ${stamp.color}66)`,
                        boxShadow: `0 0 16px ${stamp.color}44, inset 0 1px 0 rgba(255,255,255,0.15)`,
                        border: `1.5px solid ${stamp.color}88`,
                      }
                    : {
                        background: "hsl(220 28% 12%)",
                        border: "1.5px solid hsl(220 28% 18%)",
                      }
                }
              >
                <Icon
                  className="h-6 w-6"
                  style={{ color: isEarned ? stamp.color : "hsl(215 16% 32%)" }}
                  strokeWidth={isEarned ? 2 : 1.5}
                />
                {!isEarned && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center">
                    <Lock className="h-2 w-2 text-muted-foreground/60" />
                  </div>
                )}
              </div>
              {/* Label */}
              <p
                className="text-center leading-tight"
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: isEarned ? stamp.color : "hsl(215 16% 38%)",
                  maxWidth: "52px",
                }}
              >
                {stamp.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tides section ────────────────────────────────────────────────────────────
export function TidesSection({ earned }: { earned: string[] }) {
  const earnedSet = new Set(earned);
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/70">Season Awards</p>
          <h2
            className="text-2xl font-black uppercase leading-none text-foreground"
            style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "0.04em" }}
          >
            Tides
          </h2>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-blue-400/40 to-transparent ml-1" />
        <span className="text-xs font-bold text-muted-foreground">
          {earned.length}/{TIDES.length}
        </span>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {TIDES.map((tide) => {
          const isEarned = earnedSet.has(tide.id);
          const Icon = tide.icon;
          return (
            <div
              key={tide.id}
              className="relative flex items-center gap-3 rounded-xl px-3.5 py-3 overflow-hidden"
              style={
                isEarned
                  ? {
                      background: `linear-gradient(135deg, hsl(222 42% 10%) 0%, hsl(222 42% 13%) 100%)`,
                      border: `1px solid ${tide.color}44`,
                      boxShadow: `inset 0 0 24px ${tide.glow}`,
                    }
                  : {
                      background: "hsl(220 28% 10%)",
                      border: "1px solid hsl(220 28% 16%)",
                    }
              }
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={
                  isEarned
                    ? { background: `${tide.color}20`, border: `1px solid ${tide.color}40` }
                    : { background: "hsl(220 28% 14%)", border: "1px solid hsl(220 28% 20%)" }
                }
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: isEarned ? tide.color : "hsl(215 16% 30%)" }}
                  strokeWidth={isEarned ? 2 : 1.5}
                />
              </div>

              {/* Label */}
              <div className="min-w-0">
                <p
                  className="font-bold leading-tight truncate"
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: isEarned ? tide.color : "hsl(215 16% 32%)",
                  }}
                >
                  {tide.label}
                </p>
                {!isEarned && (
                  <p className="flex items-center gap-1 mt-0.5" style={{ fontSize: "9px", color: "hsl(215 16% 28%)" }}>
                    <Lock className="h-2 w-2" /> Locked
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Archetype section ────────────────────────────────────────────────────────
export function ArchetypeSection({ archetype }: { archetype: string | null | undefined }) {
  const resolved = archetype ?? "The Climb";
  const arch = ARCHETYPES.find((a) => a.id === resolved) ?? ARCHETYPES.find((a) => a.id === "The Climb")!;
  const Icon = arch.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: `${arch.accent}99` }}>
            Player Identity
          </p>
          <h2
            className="text-2xl font-black uppercase leading-none text-foreground"
            style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "0.04em" }}
          >
            Archetype
          </h2>
        </div>
        <div className="flex-1 h-px ml-1" style={{ background: `linear-gradient(to right, ${arch.accent}50, transparent)` }} />
      </div>

      {/* Archetype card */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${arch.gradient} p-6`}
        style={{ border: `1px solid ${arch.accent}30`, boxShadow: `0 0 40px ${arch.accent}18` }}
      >
        {/* Background watermark icon */}
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5"
          aria-hidden="true"
          style={{ color: arch.accent }}
        >
          <Icon className="w-32 h-32" strokeWidth={1} />
        </div>

        {/* Content */}
        <div className="relative flex items-center gap-5">
          {/* Icon circle */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${arch.accent}18`,
              border: `1.5px solid ${arch.accent}50`,
              boxShadow: `0 0 20px ${arch.accent}20`,
            }}
          >
            <Icon className="w-8 h-8" style={{ color: arch.accent }} strokeWidth={1.75} />
          </div>

          {/* Text */}
          <div>
            <p
              className="leading-none mb-1.5"
              style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: `${arch.accent}cc` }}
            >
              Archetype
            </p>
            <h3
              className="text-white leading-tight"
              style={{ fontFamily: "'Anton', sans-serif", fontSize: "1.75rem", letterSpacing: "0.03em", textTransform: "uppercase" }}
            >
              {arch.label}
            </h3>
            <p
              className="mt-1.5 leading-snug"
              style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", maxWidth: "220px" }}
            >
              {arch.tagline}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Full recognition block (all three) ──────────────────────────────────────
export function RecognitionBlock({
  stamps,
  tides,
  archetype,
}: {
  stamps: string[];
  tides: string[];
  archetype?: string | null;
}) {
  return (
    <div className="space-y-8">
      <StampsSection earned={stamps} />
      <TidesSection earned={tides} />
      <ArchetypeSection archetype={archetype} />
    </div>
  );
}
