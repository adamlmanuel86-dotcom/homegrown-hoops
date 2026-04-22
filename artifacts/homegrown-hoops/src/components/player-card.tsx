import { useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import {
  Download, User, Compass, Anchor, Wind, Zap, Target, Mountain, Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STAMPS } from "@/components/recognition";

const ARCHETYPE_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  Uncharted:     { icon: Compass,  color: "#94A3B8", label: "Uncharted" },
  "The Mainstay":{ icon: Anchor,   color: "#60A5FA", label: "The Mainstay" },
  "The Vortex":  { icon: Wind,     color: "#34D399", label: "The Vortex" },
  "The Current": { icon: Zap,      color: "#38BDF8", label: "The Current" },
  "The Distance":{ icon: Target,   color: "#A78BFA", label: "The Distance" },
  "The Climb":   { icon: Mountain, color: "#F97316", label: "The Climb" },
  "The Spark":   { icon: Flame,    color: "#F472B6", label: "The Spark" },
};

export type CardStats = {
  avgPoints: number | string;
  avgRebounds: number | string;
  avgAssists: number | string;
};

export type CardProfile = {
  firstName: string;
  lastName: string;
  school?: string | null;
  archetype?: string | null;
  stamps?: { id: string; earnedAt: string }[] | null;
  tides?: { id: string; earnedAt: string }[] | null;
};

type Props = {
  profile: CardProfile;
  stats?: CardStats;
  primaryColor?: string;
  secondaryColor?: string;
};

export function PlayerCard({
  profile,
  stats,
  primaryColor = "#B45309",
  secondaryColor = "#1E3A5F",
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const earnedIds = new Set((profile.stamps ?? []).map((s) => s.id));
  const earnedStamps = STAMPS.filter((s) => earnedIds.has(s.id));
  const unearnedStamps = STAMPS.filter((s) => !earnedIds.has(s.id));

  const sortedEarned = [...earnedStamps].sort((a, b) => {
    const aDate = profile.stamps?.find((s) => s.id === a.id)?.earnedAt ?? "";
    const bDate = profile.stamps?.find((s) => s.id === b.id)?.earnedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  const displayStamps: { stamp: (typeof STAMPS)[0]; earned: boolean }[] = [];
  let overflowCount = 0;

  if (sortedEarned.length > 5) {
    sortedEarned.slice(0, 5).forEach((s) => displayStamps.push({ stamp: s, earned: true }));
    overflowCount = sortedEarned.length - 5;
  } else {
    sortedEarned.forEach((s) => displayStamps.push({ stamp: s, earned: true }));
    unearnedStamps.slice(0, 5 - sortedEarned.length).forEach((s) =>
      displayStamps.push({ stamp: s, earned: false })
    );
  }

  const legacyScore =
    (earnedStamps.length * 100) + ((profile.tides ?? []).length * 500);

  const archetypeKey = profile.archetype ?? "Uncharted";
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
                  border: `2px solid ${archetypeColor}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 20px ${archetypeColor}22`,
                }}
              >
                <User style={{ width: 40, height: 40, color: "hsl(220,20%,28%)" }} />
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
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {displayStamps.map(({ stamp, earned }) => {
                const Icon = stamp.icon;
                return (
                  <div
                    key={stamp.id}
                    style={{
                      width: 34,
                      height: 34,
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
                    <Icon style={{ width: 15, height: 15, color: earned ? stamp.color : "hsl(220,20%,30%)" }} />
                  </div>
                );
              })}
              {overflowCount > 0 && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "hsl(220,36%,12%)",
                    border: "1.5px solid hsl(220,36%,18%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#F97316" }}>
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

            {/* Legacy Score */}
            <div style={{ textAlign: "center", marginBottom: 12 }}>
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

      {/* ── Share / download button ── */}
      <button
        onClick={handleDownload}
        style={{ width: 320 }}
        className="btn-primary"
      >
        <Download className="h-4 w-4" />
        Save Card to Device
      </button>
    </div>
  );
}
