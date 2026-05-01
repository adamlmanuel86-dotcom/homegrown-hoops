import { useState } from "react";
import {
  Hash, Square, Eye, Droplets, Target, Zap, Layers, Crown,
  Waves, TrendingUp, Shield, Lightbulb, Activity, MapPin, Sparkles, Mountain,
  Anchor, Wind, Flame, Lock, X, Calendar, Compass, ChevronRight,
  Swords, ShieldX, Grip, Scissors, Castle, Star,
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
    description: "Dominated the glass. Controlled the boards with 5 or more rebounds in a single game.",
    howToEarn: "Record 5 or more rebounds in a single game.",
    threshold: "5+ rebounds in one game",
  },
  {
    id: "goggles",
    label: "Goggles",
    icon: Eye,
    color: "#FBBF24",
    description: "Had eyes everywhere. Found the open man all night long.",
    howToEarn: "Record 4 or more assists in a single game.",
    threshold: "4+ assists in one game",
  },
  {
    id: "wet",
    label: "Wet",
    icon: Droplets,
    color: "#38BDF8",
    description: "Pure buckets. Put up 25 or more points in a single game.",
    howToEarn: "Score 25 or more points in a single game.",
    threshold: "25+ points in one game",
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
    id: "full_send",
    label: "Full Send",
    icon: Zap,
    color: "#F472B6",
    description: "Points, assists, and rebounds — all in one game. The complete package.",
    howToEarn: "Record at least one point, one assist, and one rebound all in the same game.",
    threshold: "Points, assists and rebounds in one game",
  },
  {
    id: "the_double",
    label: "The Double",
    icon: Layers,
    color: "#2DD4BF",
    description: "Double figures in two stat categories in a single game. Elite all-around performance.",
    howToEarn: "Record 10 or more in any two of: points, rebounds, or assists in the same game.",
    threshold: "Double figures in 2 of: points, rebounds, assists",
  },
  {
    id: "full_flood",
    label: "Full Flood",
    icon: Crown,
    color: "#F59E0B",
    description: "The triple-double. Double figures in points, rebounds, and assists all in the same game. The rarest and most prestigious Stamp on the platform.",
    howToEarn: "Record 10 or more points, 10 or more rebounds, AND 10 or more assists all in a single game.",
    threshold: "10+ points, 10+ rebounds AND 10+ assists in one game",
  },
  {
    id: "lifted",
    label: "Lifted",
    icon: Swords,
    color: "#EF4444",
    description: "Pick pocket. Came up with 2 or more steals in a single game — disrupting plays and creating opportunities.",
    howToEarn: "Record 2 or more steals in a single game.",
    threshold: "2+ steals in one game",
  },
  {
    id: "not_today",
    label: "Not Today",
    icon: ShieldX,
    color: "#6366F1",
    description: "Locked the paint down. Rejected 2 or more shots in a single game.",
    howToEarn: "Record 2 or more blocks in a single game.",
    threshold: "2+ blocks in one game",
  },
  {
    id: "sure_hands",
    label: "Sure Hands",
    icon: Grip,
    color: "#10B981",
    description: "Handled the ball without giving it away. Recorded zero turnovers in a single game.",
    howToEarn: "Record zero turnovers in a single game.",
    threshold: "0 turnovers in one game",
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
    description: "The player with the highest total points at season end.",
    howToEarn: "Finish the season with the highest total points.",
    threshold: "Highest total points for the season",
  },
  {
    id: "rising_tide",
    label: "Rising Tide",
    icon: TrendingUp,
    color: "#34D399",
    glow: "rgba(52,211,153,0.25)",
    description: "The biggest leap from the first half of the season to the second half.",
    howToEarn: "Improve the most from the first half to the second half of the season.",
    threshold: "Most improved from first half to second half",
  },
  {
    id: "the_keeper",
    label: "The Keeper",
    icon: Shield,
    color: "#A78BFA",
    glow: "rgba(167,139,250,0.25)",
    description: "The player with the highest total rebounds at season end.",
    howToEarn: "Finish the season with the highest total rebounds.",
    threshold: "Highest total rebounds for the season",
  },
  {
    id: "lighthouse",
    label: "Lighthouse",
    icon: Lightbulb,
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.25)",
    description: "Always there, always steady. The most consistent performer all season long.",
    howToEarn: "Record the lowest game-to-game statistical variance across the full season.",
    threshold: "Most consistent performer — lowest stat variance all season",
  },
  {
    id: "the_swell",
    label: "The Swell",
    icon: Activity,
    color: "#F97316",
    glow: "rgba(249,115,22,0.25)",
    description: "The single highest scoring game of the season.",
    howToEarn: "Record the highest single-game scoring total of the season.",
    threshold: "Highest single game scoring total",
  },
  {
    id: "shoreline",
    label: "Shoreline",
    icon: MapPin,
    color: "#60A5FA",
    glow: "rgba(96,165,250,0.25)",
    description: "Played every game of the season.",
    howToEarn: "Appear in every game of the season.",
    threshold: "Played every game of the season",
  },
  {
    id: "the_source",
    label: "The Source",
    icon: Sparkles,
    color: "#F472B6",
    glow: "rgba(244,114,182,0.25)",
    description: "The player with the highest total assists at season end.",
    howToEarn: "Finish the season with the highest total assists.",
    threshold: "Highest total assists for the season",
  },
  {
    id: "the_crest",
    label: "The Crest",
    icon: Mountain,
    color: "#FB923C",
    glow: "rgba(251,146,60,0.25)",
    description: "The player with the highest combined points, rebounds and assists per game.",
    howToEarn: "Finish the season with the highest combined points, rebounds and assists per game.",
    threshold: "Highest combined points + rebounds + assists per game",
  },
  {
    id: "rip_tide",
    label: "Rip Tide",
    icon: Scissors,
    color: "#EF4444",
    glow: "rgba(239,68,68,0.25)",
    description: "The player who led the team in total steals for the season. A disruptive force on the defensive end.",
    howToEarn: "Finish the season with the most total steals on the team.",
    threshold: "Most total steals for the season",
  },
  {
    id: "the_wall",
    label: "The Wall",
    icon: Castle,
    color: "#6366F1",
    glow: "rgba(99,102,241,0.25)",
    description: "The player who led the team in total blocks for the season. Nothing gets through.",
    howToEarn: "Finish the season with the most total blocks on the team.",
    threshold: "Most total blocks for the season",
  },
  {
    id: "all_tide",
    label: "All Tide",
    icon: Star,
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.25)",
    description: "Led the team in combined assists and steals for the season — making plays on both ends of the floor.",
    howToEarn: "Finish the season with the highest combined total of assists and steals on the team.",
    threshold: "Most combined assists + steals for the season",
  },
  {
    id: "dead_calm",
    label: "Dead Calm",
    icon: Wind,
    color: "#67E8F9",
    glow: "rgba(103,232,249,0.25)",
    description: "The steadiest hands in the league. Finished the season with the lowest turnovers per game average — nothing rattles this player.",
    howToEarn: "Finish the season with the lowest turnovers per game average on the team (minimum 5 games played).",
    threshold: "Lowest avg turnovers per game — min 5 games played",
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
    tagline: "Your story has not been written yet — step on the court and let your game speak.",
    gradient: "from-slate-900/90 via-slate-800/70 to-slate-900/90",
    accent: "#94A3B8",
  },
  {
    id: "The Mainstay",
    label: "The Mainstay",
    icon: Anchor,
    tagline: "The go-to scorer — when points are needed this player delivers consistently.",
    gradient: "from-blue-900/80 via-blue-800/60 to-blue-900/80",
    accent: "#60A5FA",
  },
  {
    id: "The Voltage",
    label: "The Voltage",
    icon: Flame,
    tagline: "An elite scorer who creates their own shot and puts up big numbers every night.",
    gradient: "from-yellow-900/80 via-orange-800/60 to-yellow-900/80",
    accent: "#FBBF24",
  },
  {
    id: "The Engine",
    label: "The Engine",
    icon: Zap,
    tagline: "Does everything — scoring, rebounding, and playmaking at a high level. The team runs through this player.",
    gradient: "from-rose-900/80 via-red-800/60 to-rose-900/80",
    accent: "#FB7185",
  },
  {
    id: "The Vortex",
    label: "The Vortex",
    icon: Wind,
    tagline: "Rebounds are this player's signature — they control the glass on both ends.",
    gradient: "from-purple-900/80 via-violet-800/60 to-purple-900/80",
    accent: "#A78BFA",
  },
  {
    id: "The Current",
    label: "The Current",
    icon: Activity,
    tagline: "A natural playmaker whose passing defines how this team moves the ball.",
    gradient: "from-cyan-900/80 via-teal-800/60 to-cyan-900/80",
    accent: "#22D3EE",
  },
  {
    id: "The Deep",
    label: "The Deep",
    icon: Target,
    tagline: "The three pointer is this player's signature weapon — range is their superpower.",
    gradient: "from-orange-900/80 via-amber-800/60 to-orange-900/80",
    accent: "#FB923C",
  },
  {
    id: "The Climb",
    label: "The Climb",
    icon: Mountain,
    tagline: "Still writing their story — consistent contributor whose best games lie ahead.",
    gradient: "from-emerald-900/80 via-green-800/60 to-emerald-900/80",
    accent: "#34D399",
  },
  {
    id: "The Warden",
    label: "The Warden",
    icon: Shield,
    tagline: "Steals are this player's weapon — they make life difficult for every ball handler.",
    gradient: "from-violet-900/80 via-purple-800/60 to-violet-900/80",
    accent: "#8B5CF6",
  },
  {
    id: "The Wall",
    label: "The Wall",
    icon: Castle,
    tagline: "Shot blocking defines this player — they protect the paint and alter shots.",
    gradient: "from-indigo-900/80 via-blue-800/60 to-indigo-900/80",
    accent: "#6366F1",
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
  | { kind: "stamp"; meta: (typeof STAMPS)[number]; entry: RecognitionEntry | null; count: number }
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
              {item.kind === "stamp" && item.count >= 2 && (
                <span style={{ color: "#F97316", marginLeft: 4 }}>x{item.count}</span>
              )}
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

  // Build a count map: id → number of times earned
  const countMap = new Map<string, number>();
  // Keep the most-recent entry per stamp (for date display in popup)
  const latestMap = new Map<string, RecognitionEntry>();
  for (const e of earned) {
    countMap.set(e.id, (countMap.get(e.id) ?? 0) + 1);
    const existing = latestMap.get(e.id);
    if (!existing || e.earnedAt > existing.earnedAt) latestMap.set(e.id, e);
  }
  const uniqueEarned = countMap.size;

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
            {uniqueEarned}/{STAMPS.length}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-3">
          {STAMPS.map((stamp) => {
            const count = countMap.get(stamp.id) ?? 0;
            const isEarned = count > 0;
            const Icon = stamp.icon;
            return (
              <button
                key={stamp.id}
                className="flex flex-col items-center gap-1.5 cursor-pointer group"
                onClick={() => setSelected(stamp)}
                aria-label={`${stamp.label} — ${isEarned ? `earned${count >= 2 ? ` x${count}` : ""}` : "locked"}`}
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
                {/* Label — show multiplier in orange only when earned 2+ times */}
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
                  {count >= 2 && (
                    <span style={{ color: "#F97316", display: "block", fontSize: "9px" }}>
                      x{count}
                    </span>
                  )}
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
            entry: latestMap.get(selected.id) ?? null,
            count: countMap.get(selected.id) ?? 0,
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

  const earnedMap = new Map<string, RecognitionEntry>();
  const countMap = new Map<string, number>();
  for (const e of earned) {
    if (!earnedMap.has(e.id)) earnedMap.set(e.id, e);
    countMap.set(e.id, (countMap.get(e.id) ?? 0) + 1);
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/70">Career Awards</p>
            <h2
              className="text-2xl font-black uppercase leading-none text-foreground"
              style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "0.04em" }}
            >
              Tides
            </h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-blue-400/40 to-transparent ml-1" />
          <span className="text-xs font-bold text-muted-foreground">
            {earnedMap.size}/{TIDES.length}
          </span>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {TIDES.map((tide) => {
            const entry = earnedMap.get(tide.id) ?? null;
            const count = countMap.get(tide.id) ?? 0;
            const isEarned = count > 0;
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
                {/* Counter badge */}
                {count > 1 && (
                  <span
                    className="absolute top-1.5 right-1.5 text-[9px] font-black leading-none px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${tide.color}22`,
                      border: `1px solid ${tide.color}55`,
                      color: tide.color,
                      letterSpacing: "0.04em",
                    }}
                  >
                    ×{count}
                  </span>
                )}

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
