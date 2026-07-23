import { useRef, useCallback, useState, useEffect } from "react";
import { renderAvatarToCanvas } from "@/lib/avatarCanvas";
import type { AvatarConfig } from "@/lib/avatarCanvas";
import html2canvas from "html2canvas";
import {
  Share2, Loader2, User, Compass, Anchor, Wind, Zap, Target, Mountain, Flame, X,
  Shield, Castle, Activity, RotateCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STAMPS } from "@/components/recognition";

const ARCHETYPE_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  Uncharted:      { icon: Compass,  color: "#94A3B8", label: "Uncharted" },
  "The Mainstay": { icon: Anchor,   color: "#60A5FA", label: "The Mainstay" },
  "The Voltage":  { icon: Flame,    color: "#FBBF24", label: "The Voltage" },
  "The Engine":   { icon: Zap,      color: "#FB7185", label: "The Engine" },
  "The Vortex":   { icon: Wind,     color: "#34D399", label: "The Vortex" },
  "The Current":  { icon: Activity, color: "#22D3EE", label: "The Current" },
  "The Deep":     { icon: Target,   color: "#A78BFA", label: "The Deep" },
  "The Climb":    { icon: Mountain, color: "#F97316", label: "The Climb" },
  "The Warden":   { icon: Shield,   color: "#8B5CF6", label: "The Warden" },
  "The Wall":     { icon: Castle,   color: "#6366F1", label: "The Wall" },
};

export const MILESTONE_BONUSES: Record<string, { label: string; bonusLP: number }> = {
  pts_100:  { label: "100 Career Points",   bonusLP: 500 },
  pts_250:  { label: "250 Career Points",   bonusLP: 1000 },
  pts_500:  { label: "500 Career Points",   bonusLP: 2500 },
  pts_1000: { label: "1,000 Career Points", bonusLP: 5000 },
  reb_50:   { label: "50 Career Rebounds",  bonusLP: 500 },
  reb_100:  { label: "100 Career Rebounds", bonusLP: 1000 },
  ast_50:   { label: "50 Career Assists",   bonusLP: 500 },
  ast_100:  { label: "100 Career Assists",  bonusLP: 1000 },
  three_50: { label: "50 Career Threes",    bonusLP: 1000 },
  stl_50:   { label: "50 Career Steals",    bonusLP: 750 },
  blk_50:   { label: "50 Career Blocks",    bonusLP: 750 },
};

export type CardStats = {
  avgPoints: number | string;
  avgRebounds: number | string;
  avgAssists: number | string;
  avgThreesMade?: number | string;
  avgSteals?: number | string;
  avgBlocks?: number | string;
  gamesPlayed?: number;
  wins?: number;
  totalPoints?: number;
  totalRebounds?: number;
  totalAssists?: number;
  totalSteals?: number;
  totalBlocks?: number;
  totalTurnovers?: number;
  // Shooting totals (for flip-card back face)
  totalFieldGoalsMade?: number;
  totalFieldGoalsAttempted?: number;
  totalThreesMade?: number;
  totalThreesAttempted?: number;
  totalFreeThrowsMade?: number;
  totalFreeThrowsAttempted?: number;
  fieldGoalPct?: number;
  threePointPct?: number;
  freeThrowPct?: number;
};

export type CardProfile = {
  firstName: string;
  lastName: string;
  school?: string | null;
  archetype?: string | null;
  avatarUrl?: string | null;
  avatarConfig?: AvatarConfig | null;
  stamps?: { id: string; earnedAt: string }[] | null;
  tides?: { id: string; earnedAt: string }[] | null;
  milestones?: { id: string; earnedAt: string }[] | null;
  number?: string | null;
};

type Props = {
  profile: CardProfile;
  stats?: CardStats;
  /** When provided, used for Legacy Score instead of `stats`. Pass career totals here so the score never decreases after a season reset. */
  careerTotals?: CardStats;
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
    games: number; gameLP: number;
    wins: number; winLP: number;
    pts: number; ptLP: number;
    reb: number; rebLP: number;
    ast: number; astLP: number;
    stl: number; stlLP: number;
    blk: number; blkLP: number;
    tov: number; tovLP: number;
    stamps: number; stampLP: number;
    tides: number; tideLP: number;
    milestoneCount: number; milestoneLP: number;
    milestoneDetails: { label: string; bonusLP: number }[];
  };
  onClose: () => void;
}) {
  const [showMilestones, setShowMilestones] = useState(false);
  const rows: { label: string; value: string; lp: number; color: string; expandable?: boolean }[] = [
    { label: `${breakdown.games} Games Played`, value: "×25", lp: breakdown.gameLP, color: "#4ADE80" },
    { label: `${breakdown.wins} Team Wins`, value: "×50", lp: breakdown.winLP, color: "#FBBF24" },
    { label: `${breakdown.pts} Career Points`, value: "×10", lp: breakdown.ptLP, color: "#F97316" },
    { label: `${breakdown.reb} Career Rebounds`, value: "×15", lp: breakdown.rebLP, color: "#38BDF8" },
    { label: `${breakdown.ast} Career Assists`, value: "×20", lp: breakdown.astLP, color: "#34D399" },
    { label: `${breakdown.stl} Career Steals`, value: "×35", lp: breakdown.stlLP, color: "#A78BFA" },
    { label: `${breakdown.blk} Career Blocks`, value: "×35", lp: breakdown.blkLP, color: "#6366F1" },
    { label: `${breakdown.tov} Career Turnovers`, value: "×(−10)", lp: breakdown.tovLP, color: "#EF4444" },
    { label: `${breakdown.stamps} Stamps Earned`, value: "×200", lp: breakdown.stampLP, color: "#FBBF24" },
    { label: `${breakdown.tides} Tides Earned`, value: "×1,000", lp: breakdown.tideLP, color: "#A78BFA" },
    ...(breakdown.milestoneLP > 0 ? [{ label: `${breakdown.milestoneCount} Career Milestone${breakdown.milestoneCount !== 1 ? "s" : ""}`, value: "bonus", lp: breakdown.milestoneLP, color: "#F59E0B", expandable: true }] : []),
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
              <div key={row.label}>
                <div
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{
                    background: "hsl(220 28% 12%)",
                    border: "1px solid hsl(220 28% 17%)",
                    cursor: row.expandable ? "pointer" : undefined,
                  }}
                  onClick={row.expandable ? () => setShowMilestones((v) => !v) : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/70">{row.label}</p>
                  </div>
                  <p className="text-xs font-bold" style={{ color: row.color }}>{row.value}</p>
                  <p
                    className="text-xs font-bold w-16 text-right"
                    style={{ color: row.lp < 0 ? "#EF4444" : "rgba(255,255,255,0.9)" }}
                  >
                    {row.lp >= 0 ? `+${row.lp.toLocaleString()}` : row.lp.toLocaleString()}
                  </p>
                </div>
                {row.expandable && showMilestones && (
                  <div className="mt-1 ml-3 space-y-1">
                    {breakdown.milestoneDetails.map((m) => (
                      <div key={m.label} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: "hsl(220 28% 10%)", border: "1px solid #F59E0B22" }}>
                        <p className="text-xs text-white/60">{m.label}</p>
                        <p className="text-xs font-bold" style={{ color: "#F59E0B" }}>+{m.bonusLP.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: "hsl(220 28% 11%)", border: "1px solid hsl(220 28% 16%)" }}
          >
            <p style={{ color: "hsl(215 16% 65%)" }}>
              Your Legacy Score grows every game and never resets. You earn 25 points just for showing up, plus 50 bonus points for every team win. Every point, rebound and assist adds to it. Earn Stamps, Tides, and Career Milestones for big bonus points. Your Legacy Score is yours forever.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card back face — career totals + shooting splits ────────────────────────
function CardBack({
  profile,
  stats,
  careerTotals,
  primaryColor,
  onFlip,
}: {
  profile: CardProfile;
  stats?: CardStats;
  careerTotals?: CardStats;
  primaryColor: string;
  onFlip: () => void;
}) {
  const lp = careerTotals ?? stats;
  const BG_DEEP = "hsl(222,42%,7%)";
  const BG_CARD = "hsl(220,36%,10%)";
  const DIVIDER = "hsl(220,36%,14%)";
  const MUTED = "hsl(220,20%,38%)";

  const fgm  = lp?.totalFieldGoalsMade    ?? 0;
  const fga  = lp?.totalFieldGoalsAttempted ?? 0;
  const tpm  = lp?.totalThreesMade         ?? 0;
  const tpa  = lp?.totalThreesAttempted    ?? 0;
  const ftm  = lp?.totalFreeThrowsMade     ?? 0;
  const fta  = lp?.totalFreeThrowsAttempted ?? 0;
  const fgPct  = lp?.fieldGoalPct  ?? (fga  > 0 ? Math.round((fgm  / fga)  * 1000) / 10 : 0);
  const tpPct  = lp?.threePointPct ?? (tpa  > 0 ? Math.round((tpm  / tpa)  * 1000) / 10 : 0);
  const ftPct  = lp?.freeThrowPct  ?? (fta  > 0 ? Math.round((ftm  / fta)  * 1000) / 10 : 0);

  const totals = [
    { label: "PTS",  value: lp?.totalPoints    ?? 0, color: "#F97316" },
    { label: "REB",  value: lp?.totalRebounds  ?? 0, color: "#38BDF8" },
    { label: "AST",  value: lp?.totalAssists   ?? 0, color: "#34D399" },
    { label: "STL",  value: lp?.totalSteals    ?? 0, color: "#A78BFA" },
    { label: "BLK",  value: lp?.totalBlocks    ?? 0, color: "#6366F1" },
  ];

  const shooting = [
    { label: "FG",  made: fgm, att: fga, pct: fgPct,  color: "#F97316" },
    { label: "3PT", made: tpm, att: tpa, pct: tpPct,  color: "#A78BFA" },
    { label: "FT",  made: ftm, att: fta, pct: ftPct,  color: "#34D399" },
  ];

  return (
    <div
      style={{
        width: 320,
        background: `linear-gradient(140deg, ${primaryColor}, hsl(220,36%,10%) 55%, ${primaryColor}88)`,
        borderRadius: 22,
        padding: 2,
        boxShadow: `0 8px 40px ${primaryColor}44, 0 2px 8px #0008`,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        position: "absolute",
        top: 0,
        left: 0,
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
        {/* Header */}
        <div
          style={{
            padding: "14px 20px 12px",
            background: BG_CARD,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                fontSize: 18,
                fontWeight: 800,
                color: "#ffffff",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: 0,
                lineHeight: 1,
              }}
            >
              {profile.firstName} {profile.lastName}
            </p>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                margin: "4px 0 0",
              }}
            >
              Career Totals · {lp?.gamesPlayed ?? 0} GP
            </p>
          </div>
          {profile.number && (
            <p
              style={{
                fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                fontSize: 28,
                fontWeight: 900,
                color: primaryColor,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                textShadow: `0 0 14px ${primaryColor}66`,
              }}
            >
              #{profile.number}
            </p>
          )}
        </div>

        <div style={{ height: 1, background: DIVIDER }} />

        {/* Career stat totals */}
        <div style={{ display: "flex", padding: "14px 20px" }}>
          {totals.map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                textAlign: "center",
                borderRight: i < totals.length - 1 ? `1px solid ${DIVIDER}` : "none",
              }}
            >
              <p
                style={{
                  fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                  fontSize: 24,
                  fontWeight: 800,
                  color: s.color,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: 4,
                }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: DIVIDER, margin: "0 20px" }} />

        {/* Shooting splits */}
        <div style={{ padding: "12px 20px 14px" }}>
          <p
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              margin: "0 0 10px 0",
            }}
          >
            Shooting Splits
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shooting.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: `${s.color}0d`,
                  border: `1px solid ${s.color}28`,
                  borderRadius: 10,
                  padding: "8px 12px",
                }}
              >
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: s.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    width: 28,
                    margin: 0,
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#ffffff",
                    margin: 0,
                    lineHeight: 1,
                    flex: 1,
                  }}
                >
                  {s.made}-{s.att}
                </p>
                <p
                  style={{
                    fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                    fontSize: 20,
                    fontWeight: 800,
                    color: s.color,
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {s.pct.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: DIVIDER, margin: "0 20px" }} />

        {/* Footer — flip back button */}
        <div style={{ padding: "12px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 18, height: 18, borderRadius: "50%", background: "#F97316",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, lineHeight: 1,
              }}
            >
              🏀
            </div>
            <span
              style={{
                fontSize: 7, fontWeight: 800, color: MUTED,
                textTransform: "uppercase", letterSpacing: "0.07em",
              }}
            >
              Homegrown Hoops
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onFlip(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "hsl(220,36%,14%)",
              border: "1px solid hsl(220,36%,20%)",
              borderRadius: 8,
              padding: "5px 10px",
              cursor: "pointer",
              color: MUTED,
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            <RotateCw style={{ width: 10, height: 10 }} />
            Flip
          </button>
        </div>
      </div>
    </div>
  );
}

function AvatarThumb({ config }: { config: AvatarConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const off = document.createElement("canvas");
    off.width = 88;
    off.height = 128;
    renderAvatarToCanvas(off, config, { scale: 2 });
    // Scale baller to fill circle width; position so head sits ~2px from top
    // Head top in 88×128 canvas is ~6.4px (headY=12, headR=8.8, scale=2)
    const scaleX = 90 / off.width;
    const dw = off.width * scaleX;
    const dh = off.height * scaleX;
    const dx = (90 - dw) / 2 - 3;
    const dy = 7 - 6.4 * scaleX;
    ctx.clearRect(0, 0, 90, 90);
    ctx.drawImage(off, dx, dy, dw, dh);
  }, [config]);
  return (
    <canvas
      ref={canvasRef}
      width={90}
      height={90}
      style={{ display: "block" }}
    />
  );
}

export function PlayerCard({
  profile,
  stats,
  careerTotals,
  primaryColor = "#B45309",
  secondaryColor = "#1E3A5F",
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showStampsPopup, setShowStampsPopup] = useState(false);
  const [showLegacyPopup, setShowLegacyPopup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

  const earnedIds = new Set((profile.stamps ?? []).map((s) => s.id));
  const earnedStamps = STAMPS.filter((s) => earnedIds.has(s.id));
  const unearnedStamps = STAMPS.filter((s) => !earnedIds.has(s.id));

  const stampCountMap = new Map<string, number>();
  for (const s of profile.stamps ?? []) {
    stampCountMap.set(s.id, (stampCountMap.get(s.id) ?? 0) + 1);
  }

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

  const uniqueStampCount = new Set((profile.stamps ?? []).map((s) => s.id)).size;
  const totalTides = (profile.tides ?? []).length;
  const archetypeKey = profile.archetype ?? "Uncharted";

  const lp = careerTotals ?? stats;
  const gameLP  = (lp?.gamesPlayed    ?? 0) * 25;
  const winLP   = (lp?.wins           ?? 0) * 50;
  const ptLP    = (lp?.totalPoints    ?? 0) * 10;
  const rebLP   = (lp?.totalRebounds  ?? 0) * 15;
  const astLP   = (lp?.totalAssists   ?? 0) * 20;
  const stlLP   = (lp?.totalSteals    ?? 0) * 35;
  const blkLP   = (lp?.totalBlocks    ?? 0) * 35;
  const tovLP   = (lp?.totalTurnovers ?? 0) * -10;
  const stampLP = uniqueStampCount * 200;
  const tideLP  = totalTides * 1000;

  const earnedMilestones = (profile.milestones ?? []).map((m) => ({
    id: m.id,
    ...(MILESTONE_BONUSES[m.id] ?? { label: m.id, bonusLP: 0 }),
  }));
  const milestoneLP = earnedMilestones.reduce((sum, m) => sum + m.bonusLP, 0);

  const legacyScore = gameLP + winLP + ptLP + rebLP + astLP + stlLP + blkLP + tovLP + stampLP + tideLP + milestoneLP;

  const legacyBreakdown = {
    games: lp?.gamesPlayed   ?? 0, gameLP,
    wins:  lp?.wins          ?? 0, winLP,
    pts:   lp?.totalPoints   ?? 0, ptLP,
    reb:   lp?.totalRebounds ?? 0, rebLP,
    ast:   lp?.totalAssists  ?? 0, astLP,
    stl:   lp?.totalSteals   ?? 0, stlLP,
    blk:   lp?.totalBlocks   ?? 0, blkLP,
    tov:   lp?.totalTurnovers ?? 0, tovLP,
    stamps: uniqueStampCount, stampLP,
    tides:  totalTides, tideLP,
    milestoneCount: earnedMilestones.length,
    milestoneLP,
    milestoneDetails: earnedMilestones,
  };

  const meta = ARCHETYPE_META[archetypeKey] ?? ARCHETYPE_META["Uncharted"];
  const ArchetypeIcon = meta.icon;
  const archetypeColor = meta.color;
  const archetypeLabel = meta.label;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    setSaveError(null);

    try {
      const el = cardRef.current;
      const filename = `${profile.firstName}-${profile.lastName}-hgh-card.png`;

      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Image generation failed.");

      const file = new File([blob], filename, { type: "image/png" });

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: "My Homegrown Hoops Card" });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Card export failed:", err);
      setSaveError("Couldn't save the card automatically. Long-press the card image and choose Save Image.");
    } finally {
      setSaving(false);
    }
  }, [profile.firstName, profile.lastName, saving]);

  const BG_DEEP = "hsl(222,42%,7%)";
  const BG_CARD = "hsl(220,36%,10%)";
  const DIVIDER = "hsl(220,36%,14%)";
  const MUTED = "hsl(220,20%,38%)";

  const fmtAvg = (v: number | string | undefined): string => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) ? n.toFixed(1) : "—";
  };

  const threePointAvg =
    stats?.avgThreesMade ??
    (stats as { avgThreePointersMade?: number | string; threePointAvg?: number | string } | undefined)?.avgThreePointersMade ??
    (stats as { avgThreePointersMade?: number | string; threePointAvg?: number | string } | undefined)?.threePointAvg ??
    (stats as { totalThreesMade?: number | string; threesMade?: number | string; gamesPlayed?: number } | undefined)?.totalThreesMade ??
    (stats as { totalThreesMade?: number | string; threesMade?: number | string; gamesPlayed?: number } | undefined)?.threesMade;

  const toNum = (v: number | string | undefined): number => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  };

  const candidateStats = [
    { label: "RPG", raw: toNum(stats?.avgRebounds) },
    { label: "APG", raw: toNum(stats?.avgAssists) },
    { label: "3PG", raw: toNum(threePointAvg) },
    { label: "SPG", raw: toNum(stats?.avgSteals) },
    { label: "BPG", raw: toNum(stats?.avgBlocks) },
  ]
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 3);

  const statItems = [
    { label: "PPG", value: fmtAvg(stats?.avgPoints) },
    ...candidateStats.map(({ label, raw }) => ({ label, value: raw.toFixed(1) })),
  ];

  // Card height — measured as inner content; the flip wrapper must match this
  const CARD_HEIGHT = 568;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>

      {/* ── Flip container ── */}
      <div
        style={{
          width: 324,
          height: CARD_HEIGHT,
          perspective: "1200px",
          cursor: "pointer",
        }}
        onClick={() => {
          if (!showStampsPopup && !showLegacyPopup) setFlipped((f) => !f);
        }}
        title={flipped ? "Click to flip back" : "Click to see career totals"}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ── FRONT: original card ── */}
          <div
            ref={cardRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 320,
              background: `linear-gradient(140deg, ${primaryColor}, ${secondaryColor} 55%, ${primaryColor}88)`,
              borderRadius: 22,
              padding: 2,
              boxShadow: `0 8px 40px ${primaryColor}44, 0 2px 8px #0008`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
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
                {/* Jersey number — top-right corner badge */}
                {profile.number != null && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 14,
                      fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                      fontSize: 22,
                      fontWeight: 900,
                      color: primaryColor,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                      textShadow: `0 0 14px ${primaryColor}66`,
                      userSelect: "none",
                    }}
                  >
                    #{profile.number}
                  </div>
                )}

                {/* Flip hint — top-left */}
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6,
                    padding: "3px 7px",
                  }}
                >
                  <RotateCw style={{ width: 8, height: 8, color: MUTED }} />
                  <span style={{ fontSize: 7, fontWeight: 700, color: MUTED, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                    Tap to flip
                  </span>
                </div>

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
                    ) : profile.avatarConfig ? (
                      <AvatarThumb config={profile.avatarConfig} />
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
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    width: "fit-content",
                    marginTop: 9,
                    margin: "9px auto 0",
                    padding: "4px 12px",
                    borderRadius: 20,
                    background: `${archetypeColor}18`,
                    border: `1px solid ${archetypeColor}44`,
                  }}
                >
                  <ArchetypeIcon style={{ width: 11, height: 11, color: archetypeColor, verticalAlign: "middle" }} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: archetypeColor,
                      textShadow: `0 0 14px ${archetypeColor}`,
                      verticalAlign: "middle",
                    }}
                  >
                    {archetypeLabel}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: DIVIDER, margin: "0 20px" }} />

              {/* ── Stats strip ── */}
              <div style={{ display: "flex", padding: "12px 20px" }}>
                {statItems.map((stat, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      borderRight: i < statItems.length - 1 ? `1px solid ${DIVIDER}` : "none",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                        fontSize: 22,
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
                        letterSpacing: "0.08em",
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
                    const count = earned ? (stampCountMap.get(stamp.id) ?? 1) : 0;
                    return (
                      <div
                        key={stamp.id}
                        style={{ position: "relative", display: "inline-flex" }}
                      >
                        <div
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
                        {count >= 2 && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: -3,
                              right: -3,
                              background: "#F97316",
                              color: "#fff",
                              fontSize: 7,
                              fontWeight: 800,
                              lineHeight: 1,
                              padding: "1.5px 3px",
                              borderRadius: 4,
                              letterSpacing: "0.02em",
                              pointerEvents: "none",
                              border: "1px solid hsl(222,42%,9%)",
                            }}
                          >
                            ×{count}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {overflowCount > 0 && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setShowStampsPopup(true); }}
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
                  onClick={(e) => { e.stopPropagation(); setShowLegacyPopup(true); }}
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
                      marginTop: 6,
                    }}
                  >
                    Legacy Score
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

          {/* ── BACK: career totals ── */}
          <CardBack
            profile={profile}
            stats={stats}
            careerTotals={careerTotals}
            primaryColor={primaryColor}
            onFlip={() => setFlipped(false)}
          />
        </div>
      </div>

      {/* ── Share / download button (front only) ── */}
      {!flipped && (
        <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleDownload}
            disabled={saving}
            style={{ width: "100%" }}
            className="btn-primary"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating Card…</>
            ) : (
              <><Share2 className="h-4 w-4" /> Save Card to Device</>
            )}
          </button>
          {saveError && (
            <p style={{ fontSize: 12, color: "#F97316", textAlign: "center", lineHeight: 1.4 }}>
              {saveError}
            </p>
          )}
        </div>
      )}

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
