import { useRef, useCallback, useState } from "react";
import { toPng } from "html-to-image";
import {
  Download, User, Compass, Anchor, Wind, Zap, Target, Mountain, Flame, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STAMPS } from "@/components/recognition";

const ARCHETYPE_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  Uncharted:     { icon: Compass,  color: "#94A3B8", label: "Uncharted" },
  "The Mainstay":{ icon: Anchor,   color: "#60A5FA", label: "The Mainstay" },
  "The Vortex":  { icon: Wind,     color: "#34D399", label: "The Vortex" },
  "The Current": { icon: Zap,      color: "#38BDF8", label: "The Current" },
  "The Deep":    { icon: Target,   color: "#A78BFA", label: "The Deep" },
  "The Climb":   { icon: Mountain, color: "#F97316", label: "The Climb" },
  "The Spark":   { icon: Flame,    color: "#F472B6", label: "The Spark" },
};

export type CardStats = {
  avgPoints: number | string;
  avgRebounds: number | string;
  avgAssists: number | string;
  totalPoints?: number;
  totalRebounds?: number;
  totalAssists?: number;
};

export type CardProfile = {
  firstName: string;
  lastName: string;
  school?: string | null;
  archetype?: string | null;
  avatarUrl?: string | null;
  stamps?: { id: string; earnedAt: string }[] | null;
  tides?: { id: string; earnedAt: string }[] | null;
};

type Props = {
  profile: CardProfile;
  stats?: CardStats;
  primaryColor?: string;
  secondaryColor?: string;
};

// ─── Stamps overflow popup ────────────────────────────────────────────────────
function StampsOverflowPopup({
  earnedStamps,
  profile,
  onClose,
}: {
  earnedStamps: (typeof STAMPS)[number][];
  profile: CardProfile;
  onClose: () => void;
}) {
  const countMap = new Map<string, number>();
  for (const s of profile.stamps ?? []) {
    countMap.set(s.id, (countMap.get(s.id) ?? 0) + 1);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "hsl(222 42% 9%)", border: "1px solid #F9731633" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #F97316, #F9731655)" }} />
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <p className="font-bold text-white text-base">All Earned Stamps</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(220 28% 14%)" }}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-2 max-h-[70vh] overflow-y-auto">
          {earnedStamps.map((stamp) => {
            const Icon = stamp.icon;
            const count = countMap.get(stamp.id) ?? 1;
            return (
              <div
                key={stamp.id}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                style={{ background: `${stamp.color}10`, border: `1px solid ${stamp.color}30` }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${stamp.color}cc, ${stamp.color}55)`,
                    border: `1.5px solid ${stamp.color}88`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: stamp.color }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm leading-tight">
                    {stamp.label}
                    {count >= 2 && (
                      <span style={{ color: "#F97316", marginLeft: 5 }}>×{count}</span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(215 16% 58%)" }}>
                    {stamp.threshold}
                  </p>
                </div>
                <div
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: "#F97316", background: "#F9731618" }}
                >
                  +{count * 200} LP
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Legacy Score explanation popup ──────────────────────────────────────────
function LegacyScorePopup({
  score,
  breakdown,
  onClose,
}: {
  score: number;
  breakdown: {
    pts: number; ptLP: number;
    reb: number; rebLP: number;
    ast: number; astLP: number;
    stamps: number; stampLP: number;
    tides: number; tideLP: number;
    archetypeBonus: number;
  };
  onClose: () => void;
}) {
  const rows: { label: string; value: string; lp: number; color: string }[] = [
    { label: `${breakdown.pts} Career Points`, value: "×10", lp: breakdown.ptLP, color: "#F97316" },
    { label: `${breakdown.reb} Career Rebounds`, value: "×15", lp: breakdown.rebLP, color: "#38BDF8" },
    { label: `${breakdown.ast} Career Assists`, value: "×20", lp: breakdown.astLP, color: "#34D399" },
    { label: `${breakdown.stamps} Stamps Earned`, value: "×200", lp: breakdown.stampLP, color: "#FBBF24" },
    { label: `${breakdown.tides} Tides Earned`, value: "×1,000", lp: breakdown.tideLP, color: "#A78BFA" },
    ...(breakdown.archetypeBonus > 0
      ? [{ label: "Archetype Unlocked", value: "+500", lp: breakdown.archetypeBonus, color: "#60A5FA" }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "hsl(222 42% 9%)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #F97316, #A78BFA)" }} />

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <p className="font-bold text-white text-base">Legacy Score</p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(215 16% 55%)" }}>How your score is calculated</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(220 28% 14%)" }}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            <p className="font-display text-4xl font-black text-white">{score.toLocaleString()}</p>
            <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: "#F97316" }}>
              Legacy Points
            </p>
          </div>

          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ background: "hsl(220 28% 12%)", border: "1px solid hsl(220 28% 17%)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/70">{row.label}</p>
                </div>
                <p className="text-xs font-bold" style={{ color: row.color }}>{row.value}</p>
                <p className="text-xs font-bold text-white/90 w-16 text-right">+{row.lp.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: "hsl(220 28% 11%)", border: "1px solid hsl(220 28% 16%)" }}
          >
            <p style={{ color: "hsl(215 16% 65%)" }}>
              Your Legacy Score grows every game and never resets. Every point, rebound and assist adds to it. Earn Stamps and Tides for big bonus points. Your Legacy Score is yours forever.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerCard({
  profile,
  stats,
  primaryColor = "#B45309",
  secondaryColor = "#1E3A5F",
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showStampsPopup, setShowStampsPopup] = useState(false);
  const [showLegacyPopup, setShowLegacyPopup] = useState(false);

  const earnedIds = new Set((profile.stamps ?? []).map((s) => s.id));
  const earnedStamps = STAMPS.filter((s) => earnedIds.has(s.id));
  const unearnedStamps = STAMPS.filter((s) => !earnedIds.has(s.id));

  const sortedEarned = [...earnedStamps].sort((a, b) => {
    const aDate = profile.stamps?.find((s) => s.id === a.id)?.earnedAt ?? "";
    const bDate = profile.stamps?.find((s) => s.id === b.id)?.earnedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  const MAX_VISIBLE = 6;
  const displayStamps: { stamp: (typeof STAMPS)[0]; earned: boolean }[] = [];
  let overflowCount = 0;

  if (sortedEarned.length > MAX_VISIBLE) {
    sortedEarned.slice(0, MAX_VISIBLE).forEach((s) => displayStamps.push({ stamp: s, earned: true }));
    overflowCount = sortedEarned.length - MAX_VISIBLE;
  } else {
    sortedEarned.forEach((s) => displayStamps.push({ stamp: s, earned: true }));
    unearnedStamps.slice(0, MAX_VISIBLE - sortedEarned.length).forEach((s) =>
      displayStamps.push({ stamp: s, earned: false })
    );
  }

  // Legacy Score formula
  const totalStampEarnings = (profile.stamps ?? []).length;
  const totalTides = (profile.tides ?? []).length;
  const archetypeKey = profile.archetype ?? "Uncharted";
  const archetypeBonus = archetypeKey !== "Uncharted" ? 500 : 0;

  const ptLP  = (stats?.totalPoints   ?? 0) * 10;
  const rebLP = (stats?.totalRebounds ?? 0) * 15;
  const astLP = (stats?.totalAssists  ?? 0) * 20;
  const stampLP = totalStampEarnings * 200;
  const tideLP  = totalTides * 1000;

  const legacyScore = ptLP + rebLP + astLP + stampLP + tideLP + archetypeBonus;

  const legacyBreakdown = {
    pts: stats?.totalPoints   ?? 0, ptLP,
    reb: stats?.totalRebounds ?? 0, rebLP,
    ast: stats?.totalAssists  ?? 0, astLP,
    stamps: totalStampEarnings, stampLP,
    tides: totalTides, tideLP,
    archetypeBonus,
  };

  const meta = ARCHETYPE_META[archetypeKey] ?? ARCHETYPE_META["Uncharted"];
  const ArchetypeIcon = meta.icon;
  const archetypeColor = meta.color;
  const archetypeLabel = meta.label;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${profile.firstName}-${profile.lastName}-hgh-card.png`;
      link.click();
    } catch (err) {
      console.error("Card export failed:", err);
    }
  }, [profile.firstName, profile.lastName]);

  const BG_DEEP = "hsl(222,42%,7%)";
  const BG_CARD = "hsl(220,36%,10%)";
  const DIVIDER = "hsl(220,36%,14%)";
  const MUTED = "hsl(220,20%,38%)";

  const statItems = [
    { label: "Points", value: stats?.avgPoints ?? "—" },
    { label: "Rebounds", value: stats?.avgRebounds ?? "—" },
    { label: "Assists", value: stats?.avgAssists ?? "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      {/* ── Card (captured region) ── */}
      <div
        ref={cardRef}
        style={{
          width: 320,
          background: `linear-gradient(140deg, ${primaryColor}, ${secondaryColor} 55%, ${primaryColor}88)`,
          borderRadius: 22,
          padding: 2,
          boxShadow: `0 8px 40px ${primaryColor}44, 0 2px 8px #0008`,
        }}
      >
        <div
          style={{
            background: BG_DEEP,
            borderRadius: 20,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Photo / silhouette section ── */}
          <div
            style={{
              height: 190,
              background: `linear-gradient(180deg, ${BG_CARD} 0%, ${BG_DEEP} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${archetypeColor}28, transparent 65%)`,
              }}
            />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "hsl(220,36%,13%)",
                  border: `2px solid ${archetypeColor}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 24px ${archetypeColor}33`,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <User style={{ width: 40, height: 40, color: "hsl(220,20%,28%)" }} />
                )}
              </div>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: `${archetypeColor}1a`,
                  border: `1.5px solid ${archetypeColor}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 10px ${archetypeColor}33`,
                }}
              >
                <ArchetypeIcon style={{ width: 14, height: 14, color: archetypeColor }} />
              </div>
            </div>
          </div>

          {/* ── Name / school / archetype ── */}
          <div
            style={{
              padding: "16px 20px 14px",
              textAlign: "center",
              background: BG_DEEP,
            }}
          >
            <p
              style={{
                fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: "#ffffff",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              {profile.firstName} {profile.lastName}
            </p>
            {profile.school && (
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#F97316",
                  marginTop: 5,
                  letterSpacing: "0.05em",
                  margin: "5px 0 0",
                }}
              >
                {profile.school}
              </p>
            )}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: 9,
                padding: "4px 12px",
                borderRadius: 20,
                background: `${archetypeColor}18`,
                border: `1px solid ${archetypeColor}44`,
              }}
            >
              <ArchetypeIcon style={{ width: 11, height: 11, color: archetypeColor }} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: archetypeColor,
                  textShadow: `0 0 14px ${archetypeColor}`,
                }}
              >
                {archetypeLabel}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: DIVIDER, margin: "0 20px" }} />

          {/* ── Stats strip ── */}
          <div style={{ display: "flex", padding: "14px 20px" }}>
            {statItems.map((stat, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: "center",
                  borderRight: i < 2 ? `1px solid ${DIVIDER}` : "none",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#F97316",
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </p>
                <p
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: MUTED,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: 4,
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: DIVIDER, margin: "0 20px" }} />

          {/* ── Stamps row ── */}
          <div style={{ padding: "11px 20px 13px" }}>
            <p
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                margin: "0 0 9px 0",
              }}
            >
              Stamps
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              {displayStamps.map(({ stamp, earned }) => {
                const Icon = stamp.icon;
                return (
                  <div
                    key={stamp.id}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: earned ? `${stamp.color}20` : "hsl(220,36%,12%)",
                      border: `1.5px solid ${earned ? stamp.color + "55" : "hsl(220,36%,17%)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: earned ? 1 : 0.3,
                      boxShadow: earned ? `0 0 8px ${stamp.color}33` : "none",
                    }}
                  >
                    <Icon style={{ width: 14, height: 14, color: earned ? stamp.color : "hsl(220,20%,30%)" }} />
                  </div>
                );
              })}
              {overflowCount > 0 && (
                <div
                  onClick={() => setShowStampsPopup(true)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#F9731618",
                    border: "1.5px solid #F9731655",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#F97316" }}>
                    +{overflowCount}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: DIVIDER, margin: "0 20px" }} />

          {/* ── Bottom section ── */}
          <div style={{ padding: "4px 20px 16px", position: "relative" }}>
            {/* Wave graphic */}
            <svg
              viewBox="0 0 280 28"
              style={{ width: "100%", display: "block", marginBottom: 6, opacity: 0.18 }}
            >
              <path
                d="M0 14 C18 4, 38 24, 58 14 S100 4, 120 14 S162 24, 182 14 S222 4, 242 14 S268 24, 280 14 L280 28 L0 28Z"
                fill={primaryColor}
              />
            </svg>

            {/* Legacy Score — clickable */}
            <div
              style={{ textAlign: "center", marginBottom: 12, cursor: "pointer" }}
              onClick={() => setShowLegacyPopup(true)}
              title="Tap to see how Legacy Score is calculated"
            >
              <p
                style={{
                  fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                  fontSize: 38,
                  fontWeight: 900,
                  color: "#ffffff",
                  margin: 0,
                  lineHeight: 1,
                  textShadow: `0 0 20px ${primaryColor}66`,
                }}
              >
                {legacyScore.toLocaleString()}
              </p>
              <p
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  marginTop: 3,
                }}
              >
                Legacy Score · Tap for details
              </p>
            </div>

            {/* Logo + year */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#F97316",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    lineHeight: 1,
                  }}
                >
                  🏀
                </div>
                <span
                  style={{
                    fontSize: 7,
                    fontWeight: 800,
                    color: MUTED,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Homegrown Hoops
                </span>
              </div>
              <span
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  color: "hsl(220,20%,28%)",
                  letterSpacing: "0.06em",
                }}
              >
                2026
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Share / download button ── */}
      <button
        onClick={handleDownload}
        style={{ width: 320 }}
        className="btn-primary"
      >
        <Download className="h-4 w-4" />
        Save Card to Device
      </button>

      {/* ── Popups (outside card ref so they don't appear in download) ── */}
      {showStampsPopup && (
        <StampsOverflowPopup
          earnedStamps={sortedEarned}
          profile={profile}
          onClose={() => setShowStampsPopup(false)}
        />
      )}
      {showLegacyPopup && (
        <LegacyScorePopup
          score={legacyScore}
          breakdown={legacyBreakdown}
          onClose={() => setShowLegacyPopup(false)}
        />
      )}
    </div>
  );
}
