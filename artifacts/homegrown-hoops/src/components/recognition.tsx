import { useState } from "react";
import {
  Hash, Square, Eye, Droplets, Target, RotateCcw, Zap, Clock,
  Waves, TrendingUp, Shield, Lightbulb, Activity, MapPin, Sparkles, Mountain,
  Anchor, Wind, Flame, Lock, X, Calendar, Compass, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import type { RecognitionEntry } from "@workspace/api-client-react";

// ─── Stamp metadata ────────────────────────────────────────────────────────────
export const STAMPS: {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
  howToEarn: string;
  threshold: string;
}[] = [
  {
    id: "double_digits",
    label: "Double Digits",
    icon: Hash,
    color: "#F97316",
    description: "Put up a double-digit scoring performance in a single game.",
    howToEarn: "Score 10 or more points in any regular season or playoff game.",
    threshold: "10+ points in one game",
  },
  {
    id: "glass_work",
    label: "Glass Work",
    icon: Square,
    color: "#FB923C",
    description: "Dominated the boards — both ends — in a single game.",
    howToEarn: "Pull down 8 or more total rebounds (offensive + defensive) in one game.",
    threshold: "8+ total rebounds in one game",
  },
  {
    id: "goggles",
    label: "Goggles",
    icon: Eye,
    color: "#FBBF24",
    description: "Had eyes everywhere. Found the open man all night long.",
    howToEarn: "Record 5 or more assists in a single game.",
    threshold: "5+ assists in one game",
  },
  {
    id: "wet",
    label: "Wet",
    icon: Droplets,
    color: "#38BDF8",
    description: "Shot selection was surgical. Everything off the glass or pure.",
    howToEarn: "Shoot 50% or better from the field on at least 6 attempts in one game.",
    threshold: "50%+ FG on ≥6 attempts in one game",
  },
  {
    id: "the_distance",
    label: "The Distance",
    icon: Target,
    color: "#A78BFA",
    description: "No such thing as too deep. Range that defences can't account for.",
    howToEarn: "Knock down 3 or more three-pointers in a single game.",
    threshold: "3+ three-pointers in one game",
  },
  {
    id: "second_chance",
    label: "Second Chance",
    icon: RotateCcw,
    color: "#34D399",
    description: "Made a living on the offensive glass — kept possessions alive.",
    howToEarn: "Grab 5 or more offensive rebounds in a single game.",
    threshold: "5+ offensive rebounds in one game",
  },
  {
    id: "full_send",
    label: "Full Send",
    icon: Zap,
    color: "#F472B6",
    description: "Patrolled the paint and protected the rim without apology.",
    howToEarn: "Block 3 or more shots in a single game.",
    threshold: "3+ blocks in one game",
  },
  {
    id: "shift_worker",
    label: "Shift Worker",
    icon: Clock,
    color: "#60A5FA",
    description: "Never missed a shift. Present every game, every night.",
    howToEarn: "Record stats in every game throughout an entire regular season.",
    threshold: "Full attendance with stats for the season",
  },
];

// ─── Tide metadata ─────────────────────────────────────────────────────────────
export const TIDES: {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  glow: string;
  description: string;
  howToEarn: string;
  threshold: string;
}[] = [
  {
    id: "high_tide",
    label: "High Tide",
    icon: Waves,
    color: "#38BDF8",
    glow: "rgba(56,189,248,0.25)",
    description: "The league's leading scorer for the season. The water rose highest here.",
    howToEarn: "Finish the regular season with the most total points scored across all players.",
    threshold: "League leader in total points for the season",
  },
  {
    id: "rising_tide",
    label: "Rising Tide",
    icon: TrendingUp,
    color: "#34D399",
    glow: "rgba(52,211,153,0.25)",
    description: "The biggest leap in the league. From where you were to where you are now.",
    howToEarn: "Named the league's Most Improved Player by the admin panel at season end.",
    threshold: "Most Improved Player — admin selected",
  },
  {
    id: "the_keeper",
    label: "The Keeper",
    icon: Shield,
    color: "#A78BFA",
    glow: "rgba(167,139,250,0.25)",
    description: "The league's assist leader. The one who makes everyone around them better.",
    howToEarn: "Finish the regular season with the most total assists across all players.",
    threshold: "League leader in total assists for the season",
  },
  {
    id: "lighthouse",
    label: "Lighthouse",
    icon: Lightbulb,
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.25)",
    description: "The anchor on the glass. No one pulled down more boards all season.",
    howToEarn: "Finish the regular season with the most total rebounds across all players.",
    threshold: "League leader in total rebounds for the season",
  },
  {
    id: "the_swell",
    label: "The Swell",
    icon: Activity,
    color: "#F97316",
    glow: "rgba(249,115,22,0.25)",
    description: "The league's shot-blocking force. Changed the game without touching the ball.",
    howToEarn: "Finish the regular season with the most total blocks across all players.",
    threshold: "League leader in total blocks for the season",
  },
  {
    id: "shoreline",
    label: "Shoreline",
    icon: MapPin,
    color: "#60A5FA",
    glow: "rgba(96,165,250,0.25)",
    description: "The most reliable player in the league. Never too high, never too low.",
    howToEarn: "Earn the lowest game-to-game statistical variance rating across the season.",
    threshold: "Highest consistency rating for the season",
  },
  {
    id: "the_source",
    label: "The Source",
    icon: Sparkles,
    color: "#F472B6",
    glow: "rgba(244,114,182,0.25)",
    description: "Passed it — didn't turn it over. Led the league in assist-to-turnover ratio.",
    howToEarn: "Record the best assist-to-turnover ratio in the league for the season.",
    threshold: "Best A/T ratio in the league (min. 20 assists)",
  },
  {
    id: "the_crest",
    label: "The Crest",
    icon: Mountain,
    color: "#FB923C",
    glow: "rgba(251,146,60,0.25)",
    description: "Named to the All-League team. Recognized among the best of the season.",
    howToEarn: "Selected for the All-League team by the league admin at season end.",
    threshold: "All-League selection — admin awarded",
  },
];

// ─── Archetypes ────────────────────────────────────────────────────────────────
export const ARCHETYPES: {
  id: string;
  label: string;
  icon: LucideIcon;
  tagline: string;
  gradient: string;
  accent: string;
}[] = [
  {
    id: "Uncharted",
    label: "Uncharted",
    icon: Compass,
    tagline: "Your story hasn't been written yet.",
    gradient: "from-slate-900/90 via-slate-800/70 to-slate-900/90",
    accent: "#94A3B8",
  },
  {
    id: "The Mainstay",
    label: "The Mainstay",
    icon: Anchor,
    tagline: "Built for the long haul. Consistent, reliable, unshakeable.",
    gradient: "from-blue-900/80 via-blue-800/60 to-blue-900/80",
    accent: "#60A5FA",
  },
  {
    id: "The Vortex",
    label: "The Vortex",
    icon: Wind,
    tagline: "Opponents can't find their footing. You create chaos.",
    gradient: "from-purple-900/80 via-violet-800/60 to-purple-900/80",
    accent: "#A78BFA",
  },
  {
    id: "The Current",
    label: "The Current",
    icon: Zap,
    tagline: "Fast. Decisive. Always moving. Always in the right place.",
    gradient: "from-cyan-900/80 via-teal-800/60 to-cyan-900/80",
    accent: "#22D3EE",
  },
  {
    id: "The Distance",
    label: "The Distance",
    icon: Target,
    tagline: "Range that respects no defence. Step back and let it fly.",
    gradient: "from-orange-900/80 via-amber-800/60 to-orange-900/80",
    accent: "#FB923C",
  },
  {
    id: "The Climb",
    label: "The Climb",
    icon: Mountain,
    tagline: "Grinding upward every session. The ceiling hasn't been found.",
    gradient: "from-emerald-900/80 via-green-800/60 to-emerald-900/80",
    accent: "#34D399",
  },
  {
    id: "The Spark",
    label: "The Spark",
    icon: Flame,
    tagline: "One play and the whole gym changes. You ignite it.",
    gradient: "from-rose-900/80 via-red-800/60 to-rose-900/80",
    accent: "#F472B6",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatEarnedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Achievement Popup ─────────────────────────────────────────────────────────
type PopupItem =
  | { kind: "stamp"; meta: (typeof STAMPS)[number]; entry: RecognitionEntry | null }
  | { kind: "tide"; meta: (typeof TIDES)[number]; entry: RecognitionEntry | null };

function AchievementPopup({
  item,
  onClose,
}: {
  item: PopupItem;
  onClose: () => void;
}) {
  const { meta, entry } = item;
  const isEarned = entry !== null;
  const Icon = meta.icon;
  const color = meta.color;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      {/* Card — stop propagation so clicking inside doesn't close */}
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "hsl(222 42% 9%)",
          border: `1px solid ${isEarned ? color + "44" : "hsl(220 28% 18%)"}`,
          boxShadow: isEarned
            ? `0 0 48px ${color}18, 0 8px 32px rgba(0,0,0,0.6)`
            : "0 8px 32px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top colour bar */}
        <div
          className="h-1 w-full"
          style={{
            background: isEarned
              ? `linear-gradient(to right, ${color}, ${color}55)`
              : "hsl(220 28% 16%)",
          }}
        />

        {/* Header */}
        <div
          className="flex items-center gap-4 p-5 pb-4"
          style={{ borderBottom: "1px solid hsl(220 28% 14%)" }}
        >
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={
              isEarned
                ? {
                    background: `radial-gradient(circle at 35% 35%, ${color}bb, ${color}44)`,
                    boxShadow: `0 0 20px ${color}33`,
                    border: `1.5px solid ${color}66`,
                  }
                : {
                    background: "hsl(220 28% 12%)",
                    border: "1.5px solid hsl(220 28% 18%)",
                  }
            }
          >
            <Icon
              className="h-7 w-7"
              style={{ color: isEarned ? color : "hsl(215 16% 35%)" }}
              strokeWidth={isEarned ? 2 : 1.5}
            />
          </div>

          {/* Name + kind */}
          <div className="flex-1 min-w-0">
            <p
              className="font-bold leading-tight text-white"
              style={{ fontSize: "17px", letterSpacing: "0.01em" }}
            >
              {meta.label}
            </p>
            <p
              className="mt-0.5 font-bold uppercase"
              style={{
                fontSize: "10px",
                letterSpacing: "0.12em",
                color: isEarned ? color : "hsl(215 16% 38%)",
              }}
            >
              {item.kind === "stamp" ? "Stamp" : "Tide"} ·{" "}
              {isEarned ? "Earned" : "Locked"}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "hsl(220 28% 14%)" }}
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Description */}
          <p className="text-sm leading-relaxed" style={{ color: "hsl(215 16% 70%)" }}>
            {meta.description}
          </p>

          {/* Earned / How to earn */}
          {isEarned ? (
            <div
              className="rounded-xl p-3.5 flex gap-3"
              style={{
                background: `${color}0d`,
                border: `1px solid ${color}28`,
              }}
            >
              <Calendar className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color }} />
              <div>
                <p
                  className="font-bold uppercase mb-0.5"
                  style={{ fontSize: "9px", letterSpacing: "0.14em", color: `${color}99` }}
                >
                  Earned
                </p>
                <p className="text-xs font-semibold" style={{ color }}>
                  {formatEarnedDate(entry!.earnedAt)}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-3.5 flex gap-3"
              style={{ background: "hsl(220 28% 12%)", border: "1px solid hsl(220 28% 17%)" }}
            >
              <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "hsl(215 16% 40%)" }} />
              <div>
                <p
                  className="font-bold uppercase mb-0.5"
                  style={{ fontSize: "9px", letterSpacing: "0.14em", color: "hsl(215 16% 40%)" }}
                >
                  How to earn
                </p>
                <p className="text-xs" style={{ color: "hsl(215 16% 58%)", lineHeight: 1.5 }}>
                  {meta.howToEarn}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stamps Section ────────────────────────────────────────────────────────────
export function StampsSection({ earned }: { earned: RecognitionEntry[] }) {
  const [selected, setSelected] = useState<(typeof STAMPS)[number] | null>(null);
  const earnedMap = new Map(earned.map((e) => [e.id, e]));

  return (
    <>
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
            const entry = earnedMap.get(stamp.id) ?? null;
            const isEarned = entry !== null;
            const Icon = stamp.icon;
            return (
              <button
                key={stamp.id}
                className="flex flex-col items-center gap-1.5 cursor-pointer group"
                onClick={() => setSelected(stamp)}
                aria-label={`${stamp.label} — ${isEarned ? "earned" : "locked"}`}
              >
                {/* Badge circle */}
                <div
                  className="relative w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95"
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Popup */}
      {selected && (
        <AchievementPopup
          item={{
            kind: "stamp",
            meta: selected,
            entry: earnedMap.get(selected.id) ?? null,
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ─── Tides Section ─────────────────────────────────────────────────────────────
export function TidesSection({ earned }: { earned: RecognitionEntry[] }) {
  const [selected, setSelected] = useState<(typeof TIDES)[number] | null>(null);
  const earnedMap = new Map(earned.map((e) => [e.id, e]));

  return (
    <>
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
            const entry = earnedMap.get(tide.id) ?? null;
            const isEarned = entry !== null;
            const Icon = tide.icon;
            return (
              <button
                key={tide.id}
                className="relative flex items-center gap-3 rounded-xl px-3.5 py-3 overflow-hidden text-left cursor-pointer group transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
                onClick={() => setSelected(tide)}
                aria-label={`${tide.label} — ${isEarned ? "earned" : "locked"}`}
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
                    <p
                      className="flex items-center gap-1 mt-0.5"
                      style={{ fontSize: "9px", color: "hsl(215 16% 28%)" }}
                    >
                      <Lock className="h-2 w-2" /> Locked
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Popup */}
      {selected && (
        <AchievementPopup
          item={{
            kind: "tide",
            meta: selected,
            entry: earnedMap.get(selected.id) ?? null,
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ─── Archetype Section ─────────────────────────────────────────────────────────
export function ArchetypeSection({
  archetype,
  showArchetypeLink = false,
}: {
  archetype: string | null | undefined;
  showArchetypeLink?: boolean;
}) {
  const resolved = archetype ?? "Uncharted";
  const arch = ARCHETYPES.find((a) => a.id === resolved) ?? ARCHETYPES.find((a) => a.id === "Uncharted")!;
  const Icon = arch.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: `${arch.accent}99` }}
          >
            Player Identity
          </p>
          <h2
            className="text-2xl font-black uppercase leading-none text-foreground"
            style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "0.04em" }}
          >
            Archetype
          </h2>
        </div>
        <div
          className="flex-1 h-px ml-1"
          style={{ background: `linear-gradient(to right, ${arch.accent}50, transparent)` }}
        />
      </div>

      {/* Card */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${arch.gradient} p-6`}
        style={{ border: `1px solid ${arch.accent}30`, boxShadow: `0 0 40px ${arch.accent}18` }}
      >
        {/* Watermark */}
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
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: `${arch.accent}cc`,
              }}
            >
              Archetype
            </p>
            <h3
              className="text-white leading-tight"
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: "1.75rem",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
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

      {/* See All Archetypes link — shown on own profile */}
      {showArchetypeLink && (
        <Link
          href="/archetypes"
          className="flex items-center justify-center gap-1.5 w-full text-xs font-bold transition-colors"
          style={{ color: `${arch.accent}99` }}
        >
          <span className="hover:underline underline-offset-2">See All Archetypes</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Full recognition block ────────────────────────────────────────────────────
export function RecognitionBlock({
  stamps,
  tides,
  archetype,
  showArchetypeLink = false,
}: {
  stamps: RecognitionEntry[];
  tides: RecognitionEntry[];
  archetype?: string | null;
  showArchetypeLink?: boolean;
}) {
  return (
    <div className="space-y-8">
      <StampsSection earned={stamps} />
      <TidesSection earned={tides} />
      <ArchetypeSection archetype={archetype} showArchetypeLink={showArchetypeLink} />
    </div>
  );
}
