import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProfile,
  useListPlayers,
  useGetPlayerStats,
  useListTeams,
  useGetPlayerSeasons,
  useGetPlayerStatsBySeason,
  useGetIsoBallProfile,
} from "@workspace/api-client-react";
import { User, Trophy, Calendar, School, ExternalLink, ChevronDown, Brain, Medal } from "lucide-react";
import { RecognitionBlock } from "@/components/recognition";
import { PlayerCard } from "@/components/player-card";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export function PublicProfilePage() {
  const { clerkUserId = "" } = useParams<{ clerkUserId: string }>();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  const { data: profile, isLoading } = useGetProfile(clerkUserId, {
    query: { enabled: !!clerkUserId },
  });

  const { data: players } = useListPlayers();
  const matchedPlayer = players?.find(
    (p) =>
      p.firstName.toLowerCase() === (profile?.firstName ?? "").toLowerCase() &&
      p.lastName.toLowerCase() === (profile?.lastName ?? "").toLowerCase()
  );

  const playerId = matchedPlayer?.id ?? 0;

  // All-season stats (for career Legacy Score)
  const { data: allSeasonStats } = useGetPlayerStats(playerId, {
    query: { enabled: !!playerId },
  });

  // Available seasons
  const { data: seasonsData } = useGetPlayerSeasons(playerId, {
    query: { enabled: !!playerId },
  });
  const seasons = seasonsData?.seasons ?? [];

  // Auto-select the team's active season (or most recent with game data) once loaded
  useEffect(() => {
    if (seasonsData && selectedSeason === null) {
      const target = seasonsData.activeSeason ?? seasonsData.seasons[0] ?? null;
      if (target) setSelectedSeason(target);
    }
  }, [seasonsData, selectedSeason]);

  // Season-specific stats (for display when a season is selected)
  const { data: seasonStats } = useGetPlayerStatsBySeason(playerId, selectedSeason, {
    query: { enabled: !!playerId && !!selectedSeason },
  });

  const { data: teams } = useListTeams();
  const team = teams?.find((t) => t.id === matchedPlayer?.teamId);
  const teamLabel = team?.name ?? "Unaffiliated / No Team";

  const { data: isoBallData } = useGetIsoBallProfile(clerkUserId || null);

  // ── Career totals for Legacy Score ─────────────────────────────────────────
  // All game stats are permanently in the DB — allSeasonStats (no season filter)
  // already covers every season a player has ever played.
  const careerGames = allSeasonStats?.gamesPlayed ?? 0;
  const careerPoints = allSeasonStats?.totalPoints ?? 0;
  const careerRebounds = allSeasonStats?.totalRebounds ?? 0;
  const careerAssists = allSeasonStats?.totalAssists ?? 0;

  const careerTotalsForCard =
    careerGames > 0
      ? {
          gamesPlayed: careerGames,
          totalPoints: careerPoints,
          totalRebounds: careerRebounds,
          totalAssists: careerAssists,
          avgPoints: careerPoints / careerGames,
          avgRebounds: careerRebounds / careerGames,
          avgAssists: careerAssists / careerGames,
        }
      : undefined;

  // ── Display stats for card ─────────────────────────────────────────────────
  const displayStats = selectedSeason
    ? seasonStats && seasonStats.gamesPlayed > 0
      ? {
          avgPoints: seasonStats.avgPoints,
          avgRebounds: seasonStats.avgRebounds,
          avgAssists: seasonStats.avgAssists,
          avgThreesMade: seasonStats.avgThreesMade,
          gamesPlayed: seasonStats.gamesPlayed,
          totalPoints: seasonStats.totalPoints,
          totalRebounds: seasonStats.totalRebounds,
          totalAssists: seasonStats.totalAssists,
        }
      : undefined
    : allSeasonStats && allSeasonStats.gamesPlayed > 0
    ? {
        avgPoints: allSeasonStats.avgPoints,
        avgRebounds: allSeasonStats.avgRebounds,
        avgAssists: allSeasonStats.avgAssists,
        avgThreesMade: allSeasonStats.avgThreesMade,
        gamesPlayed: allSeasonStats.gamesPlayed,
        totalPoints: allSeasonStats.totalPoints,
        totalRebounds: allSeasonStats.totalRebounds,
        totalAssists: allSeasonStats.totalAssists,
      }
    : undefined;

  // ── Tides ─────────────────────────────────────────────────────────────────
  // Career view: all tides ever earned (counter badges for multi-season wins).
  // Season view: only that season's tides.
  const allTides = profile?.tides ?? [];
  const tidesForBlock = selectedSeason
    ? allTides.filter((t) => t.season === selectedSeason)
    : allTides;

  // ── Archetype for selected season ──────────────────────────────────────────
  // Prefers the archived history entry. Falls back to live profile.archetype
  // when viewing the current (not-yet-archived) season.
  const displayArchetype = selectedSeason
    ? (profile?.archetypeHistory ?? []).find((h) => h.season === selectedSeason)?.archetype
      ?? profile?.archetype
      ?? "Uncharted"
    : profile?.archetype;

  // tides: keep ALL career-wide tides so PlayerCard Legacy Score counts correctly.
  // RecognitionBlock receives displayTides separately for the season-filtered grid.
  const displayProfile = profile
    ? { ...profile, archetype: displayArchetype }
    : null;

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "hsl(222, 42%, 5%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid hsl(22, 78%, 46%)",
            borderTopColor: "transparent",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!profile || !displayProfile) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "hsl(222, 42%, 5%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          textAlign: "center",
        }}
      >
        <User style={{ width: 48, height: 48, color: "hsl(215, 16%, 40%)" }} />
        <p style={{ color: "hsl(210, 16%, 88%)", fontWeight: 700, fontSize: 18, margin: 0 }}>
          Profile Not Found
        </p>
        <p style={{ color: "hsl(215, 16%, 55%)", fontSize: 14, margin: 0 }}>
          This player hasn't set up their profile yet.
        </p>
        <a
          href={`${BASE_URL}/`}
          style={{
            marginTop: 8,
            padding: "12px 24px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #F97316, #B45309)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Visit Homegrown Hoops <ExternalLink style={{ width: 14, height: 14 }} />
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "hsl(222, 42%, 5%)",
        paddingBottom: 0,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          borderBottom: "1px solid hsl(220, 28%, 13%)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href={`${BASE_URL}/`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <img
            src={`${BASE_URL}/logo.svg`}
            alt="Homegrown Hoops"
            style={{ height: 28, width: "auto" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span
            style={{
              fontFamily: "'Anton', 'Barlow Condensed', Impact, sans-serif",
              fontSize: 16,
              fontWeight: 900,
              color: "hsl(22, 78%, 60%)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Homegrown Hoops
          </span>
        </a>
        <a
          href={`${BASE_URL}/sign-up`}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            background: "linear-gradient(135deg, #F97316, #B45309)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Sign Up Free
        </a>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "32px 20px 0",
        }}
      >
        {/* Season selector */}
        {seasons.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "hsl(215, 16%, 45%)",
              }}
            >
              Season
            </span>
            <div style={{ position: "relative" }}>
              <select
                value={selectedSeason ?? ""}
                onChange={(e) => setSelectedSeason(e.target.value || null)}
                style={{
                  appearance: "none",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "hsl(210, 16%, 88%)",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 36px 8px 14px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>{s}{s === seasonsData?.activeSeason ? " · Current" : ""}</option>
                ))}
                <option value="">Career · All Seasons</option>
              </select>
              <ChevronDown
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 13,
                  height: 13,
                  color: "hsl(215, 16%, 45%)",
                  pointerEvents: "none",
                }}
              />
            </div>
            {selectedSeason && selectedSeason !== seasonsData?.activeSeason && (
              <span style={{ fontSize: 11, color: "hsl(215, 16%, 45%)" }}>
                Archived season · Legacy Score always shows career total
              </span>
            )}
            {!selectedSeason && (
              <span style={{ fontSize: 11, color: "hsl(215, 16%, 45%)" }}>
                All-time · Tides show career wins with counters
              </span>
            )}
          </div>
        )}

        {/* Player Card */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <PlayerCard
            profile={displayProfile}
            stats={displayStats}
            careerTotals={careerTotalsForCard}
            primaryColor={team?.primaryColor ?? "#B45309"}
            secondaryColor={team?.secondaryColor ?? "#1E3A5F"}
          />
        </div>

        {/* Name / info block */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            background: "hsl(220, 36%, 10%)",
            marginBottom: 24,
          }}
        >
          <div style={{ padding: "28px 28px 24px" }}>
            <h1
              style={{
                fontFamily: "'Anton', 'Barlow Condensed', Impact, sans-serif",
                fontSize: 36,
                fontWeight: 900,
                color: "#fff",
                textTransform: "uppercase",
                margin: "0 0 12px",
                lineHeight: 1.1,
              }}
            >
              {profile.number != null && (
                <span style={{ color: "hsl(22, 78%, 60%)", marginRight: 8 }}>
                  #{profile.number}
                </span>
              )}
              {profile.firstName.toUpperCase()} {profile.lastName.toUpperCase()}
            </h1>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.position && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "4px 12px",
                    borderRadius: 999,
                  }}
                >
                  <Trophy style={{ width: 11, height: 11 }} />
                  {profile.position}
                </span>
              )}
              {profile.graduationYear && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 999,
                  }}
                >
                  <Calendar style={{ width: 11, height: 11 }} />
                  Class of {profile.graduationYear}
                </span>
              )}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 999,
                }}
              >
                <School style={{ width: 11, height: 11 }} />
                {teamLabel}
              </span>
            </div>
          </div>

          {(profile.school || profile.bio) && (
            <div
              style={{
                borderTop: "1px solid hsl(220, 28%, 16%)",
                padding: "20px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {profile.school && (
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "hsl(215, 16%, 45%)",
                      margin: "0 0 4px",
                    }}
                  >
                    School
                  </p>
                  <p style={{ color: "hsl(210, 16%, 85%)", fontWeight: 600, margin: 0 }}>
                    {profile.school}
                  </p>
                </div>
              )}
              {profile.bio && (
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "hsl(215, 16%, 45%)",
                      margin: "0 0 6px",
                    }}
                  >
                    About
                  </p>
                  <p
                    style={{
                      color: "hsl(215, 16%, 62%)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {profile.bio}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recognition — stamps always career-wide; tides season-filtered when season selected */}
        <RecognitionBlock
          stamps={profile.stamps ?? []}
          tides={tidesForBlock}
          archetype={displayArchetype}
        />

        {/* Ball Knowledge — only visible after at least 1 Iso Ball session */}
        {isoBallData && isoBallData.sessionCount > 0 && (
          <PublicBallKnowledgeBlock
            totalPoints={isoBallData.totalPoints}
            sessionCount={isoBallData.sessionCount}
            level={isoBallData.level}
          />
        )}

        <div style={{ height: 32 }} />
      </div>

      {/* Signup banner */}
      <div
        style={{
          background: "linear-gradient(135deg, hsl(22, 78%, 14%), hsl(220, 42%, 10%))",
          borderTop: "1px solid hsl(22, 78%, 30%)",
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 14,
            margin: "0 0 16px",
            lineHeight: 1.6,
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Want your own profile? Sign up at Homegrown Hoops — free for the 2026 pilot season.
        </p>
        <a
          href={`${BASE_URL}/sign-up`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 28px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #F97316, #B45309)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Create My Free Profile <ExternalLink style={{ width: 15, height: 15 }} />
        </a>
      </div>
    </div>
  );
}

function getLevelColor(level: string): string {
  if (level === "Elite Playmaker")    return "#c084fc";
  if (level === "High Basketball IQ") return "#fb923c";
  if (level === "Varsity Vision")     return "#60a5fa";
  if (level === "Court Aware")        return "#4ade80";
  return "#94a3b8";
}

function PublicBallKnowledgeBlock({ totalPoints, sessionCount, level }: { totalPoints: number; sessionCount: number; level: string }) {
  const levelColor = getLevelColor(level);
  const isElite = level === "Elite Playmaker";
  const pct = Math.min(100, Math.round((totalPoints / 800) * 100));

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid hsl(220, 28%, 16%)",
        overflow: "hidden",
        background: "hsl(220, 42%, 7%)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid hsl(220, 28%, 16%)",
          background: "hsl(220, 42%, 9%)",
        }}
      >
        <Brain style={{ width: 18, height: 18, color: levelColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: "hsl(210, 16%, 85%)" }}>Ball Knowledge</span>
        {isElite && <Medal style={{ width: 16, height: 16, color: "#c084fc" }} />}
      </div>
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(215, 16%, 45%)", margin: "0 0 4px" }}>Level</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: levelColor, margin: 0 }}>{level}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(215, 16%, 45%)", margin: "0 0 4px" }}>Total Points</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "hsl(210, 16%, 85%)", margin: 0, fontVariantNumeric: "tabular-nums" }}>{totalPoints.toLocaleString()}</p>
          </div>
        </div>
        {!isElite && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "hsl(215, 16%, 45%)" }}>
              <span>Progress to Elite Playmaker</span>
              <span style={{ fontWeight: 700 }}>{totalPoints} / 800 pts</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: levelColor }} />
            </div>
          </div>
        )}
        {isElite && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 10, border: "1px solid rgba(192,132,252,0.25)", background: "rgba(192,132,252,0.08)", padding: "8px 14px" }}>
            <Medal style={{ width: 14, height: 14, color: "#c084fc", flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c084fc" }}>The Playbook Stamp Earned</span>
          </div>
        )}
        <p style={{ fontSize: 11, color: "hsl(215, 16%, 45%)", margin: 0 }}>
          {sessionCount} {sessionCount === 1 ? "session" : "sessions"} completed on Iso Ball
        </p>
      </div>
    </div>
  );
}
