import { useState } from "react";
import { Link, useParams } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetProfile,
  useListPlayers,
  useGetPlayerStats,
  useListTeams,
  useGetPlayerSeasons,
  useGetPlayerStatsBySeason,
} from "@workspace/api-client-react";
import { User, Pencil, ChevronLeft, School, Calendar, Trophy, Share2, Check, ChevronDown } from "lucide-react";
import { RecognitionBlock } from "@/components/recognition";
import { PlayerCard } from "@/components/player-card";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ProfilePage() {
  const { clerkUserId = "" } = useParams<{ clerkUserId: string }>();
  const { user, isSignedIn } = useUser();
  const [copied, setCopied] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  async function handleShare() {
    const url = `${window.location.origin}${BASE_URL}/p/${clerkUserId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

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

  // All-season stats (used for career Legacy Score on top of the careerStats snapshot)
  const { data: allSeasonStats } = useGetPlayerStats(playerId, {
    query: { enabled: !!playerId },
  });

  // Available seasons for this player
  const { data: seasonsData } = useGetPlayerSeasons(playerId, {
    query: { enabled: !!playerId },
  });
  const seasons = seasonsData?.seasons ?? [];

  // Season-specific stats (for display when a past season is selected)
  const { data: seasonStats } = useGetPlayerStatsBySeason(playerId, selectedSeason, {
    query: { enabled: !!playerId && !!selectedSeason },
  });

  const { data: teams } = useListTeams();
  const team = teams?.find((t) => t.id === matchedPlayer?.teamId);
  const teamLabel = team?.name ?? "Unaffiliated / No Team";

  const isOwner = isSignedIn && user?.id === clerkUserId;

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-[568px] bg-muted rounded-[22px] max-w-[320px] mx-auto" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto card-base p-16 text-center">
        <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-bold text-secondary text-lg mb-1">Profile Not Found</p>
        <p className="text-muted-foreground text-sm">This player hasn't set up a profile yet.</p>
      </div>
    );
  }

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

  // ── Display stats: selected season's stats, or current season's live stats ──
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
  // Career view (no season selected): show all tides ever earned, with counter
  // badges for multiple wins across seasons.
  // Season view (season selected): show only that season's tides.
  const allTides = profile.tides ?? [];
  const tidesForBlock = selectedSeason
    ? allTides.filter((t) => t.season === selectedSeason)
    : allTides;

  // ── Archetype for selected season (from history) or current ──
  const displayArchetype = selectedSeason
    ? (profile.archetypeHistory ?? []).find((h) => h.season === selectedSeason)?.archetype ?? "Uncharted"
    : profile.archetype;

  // Profile view adjusted for the selected season.
  // tides: keep ALL career-wide tides so PlayerCard Legacy Score counts correctly.
  // RecognitionBlock receives displayTides separately for the season-filtered grid.
  // Stamps are always career-wide — never filtered.
  const displayProfile = {
    ...profile,
    archetype: displayArchetype,
  };

  const isCurrent = !selectedSeason;
  const seasonLabel = selectedSeason ?? "Current Season";

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <Link
        href="/players"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-secondary transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      {/* Season selector — only shown when the player has historical data */}
      {seasons.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Season</span>
          <div className="relative">
            <select
              value={selectedSeason ?? ""}
              onChange={(e) => setSelectedSeason(e.target.value || null)}
              className="appearance-none bg-white/8 border border-white/12 text-sm font-semibold text-foreground rounded-xl px-4 py-2 pr-9 cursor-pointer hover:bg-white/12 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Current Season</option>
              {seasons.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {!isCurrent && (
            <span className="text-xs text-muted-foreground">
              Viewing {seasonLabel} · Legacy Score always shows career total
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <PlayerCard
          profile={displayProfile}
          stats={displayStats}
          careerTotals={careerTotalsForCard}
          primaryColor={team?.primaryColor ?? "#B45309"}
          secondaryColor={team?.secondaryColor ?? "#1E3A5F"}
        />
        <button
          onClick={handleShare}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            copied
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-white/8 hover:bg-white/12 text-foreground/80 hover:text-white border border-white/10"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Profile link copied — share it anywhere.
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Share Profile
            </>
          )}
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden bg-secondary text-white">
        <div className="px-8 py-10 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-4xl text-white leading-tight">
              {profile.number != null && (
                <span className="text-primary mr-2">#{profile.number}</span>
              )}
              {profile.firstName.toUpperCase()} {profile.lastName.toUpperCase()}
            </h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.position && (
                <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-bold uppercase px-3 py-1 rounded-full">
                  <Trophy className="h-3 w-3" />
                  {profile.position}
                </span>
              )}
              {profile.graduationYear && (
                <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-bold px-3 py-1 rounded-full">
                  <Calendar className="h-3 w-3" />
                  Class of {profile.graduationYear}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-bold px-3 py-1 rounded-full">
                <School className="h-3 w-3" />
                {teamLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-base p-6 space-y-5">
        {profile.school && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <School className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="label-upper mb-0.5">School</p>
              <p className="font-semibold text-secondary">{profile.school}</p>
            </div>
          </div>
        )}

        {profile.bio && (
          <div>
            <p className="label-upper mb-2">About</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {!profile.school && !profile.bio && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No additional info provided.
          </p>
        )}

        {isOwner && (
          <div className="pt-2 border-t border-border">
            <Link href="/my-profile" className="btn-primary">
              <Pencil className="h-4 w-4" /> Edit Profile
            </Link>
          </div>
        )}
      </div>

      {profile.isAdmin && (
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary tracking-wider px-1">
          <Trophy className="h-3.5 w-3.5" /> League Admin
        </div>
      )}

      <RecognitionBlock
        stamps={profile.stamps ?? []}
        tides={tidesForBlock}
        archetype={displayArchetype}
      />
    </div>
  );
}
