import { useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useGetPlayer, useGetPlayerStats, useListTeams, useListProfiles } from "@workspace/api-client-react";
import { ChevronLeft, User } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import type { CardProfile, CardStats } from "@/components/player-card";

function ShootingRow({
  label,
  made,
  att,
  pct,
  color,
}: {
  label: string;
  made: number;
  att: number;
  pct: number;
  color: string;
}) {
  const barPct = Math.min(100, pct);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {made}-{att}
          </span>
          <span className="font-display text-lg font-black tabular-nums" style={{ color }}>
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${barPct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function PlayerDetailPage() {
  const [, params] = useRoute("/players/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();

  const { data: player, isLoading: playerLoading } = useGetPlayer(id, { query: { enabled: !!id } });
  const { data: profiles, isLoading: profilesLoading } = useListProfiles();
  const { data: stats } = useGetPlayerStats(id, { query: { enabled: !!id } });
  const { data: teams } = useListTeams();

  const team = teams?.find((t) => t.id === player?.teamId);

  const matchedProfile = player && profiles
    ? profiles.find(
        (p) =>
          p.firstName.toLowerCase() === player.firstName.toLowerCase() &&
          p.lastName.toLowerCase() === player.lastName.toLowerCase()
      )
    : undefined;

  useEffect(() => {
    if (matchedProfile?.clerkUserId) {
      setLocation(`/profiles/${matchedProfile.clerkUserId}`, { replace: true });
    }
  }, [matchedProfile, setLocation]);

  if (playerLoading || profilesLoading) {
    return (
      <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-[568px] bg-muted rounded-[22px] max-w-[320px] mx-auto" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  if (matchedProfile) {
    return (
      <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-[568px] bg-muted rounded-[22px] max-w-[320px] mx-auto" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="card-base p-16 text-center max-w-4xl mx-auto">
        <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-bold text-secondary text-lg">Player not found</p>
      </div>
    );
  }

  const hasStats = stats && stats.gamesPlayed > 0;

  // Build CardProfile from player DB record
  const cardProfile: CardProfile = {
    firstName: player.firstName,
    lastName: player.lastName,
    number: player.number ?? null,
    avatarUrl: null,
    archetype: "Uncharted",
    stamps: [],
    tides: [],
    milestones: [],
  };

  // Build CardStats from player stats API
  const cardStats: CardStats | undefined = hasStats
    ? {
        avgPoints:    stats.avgPoints,
        avgRebounds:  stats.avgRebounds,
        avgAssists:   stats.avgAssists,
        avgThreesMade: stats.avgThreesMade,
        avgSteals:    stats.avgSteals,
        avgBlocks:    stats.avgBlocks,
        gamesPlayed:  stats.gamesPlayed,
        wins:         stats.wins,
        totalPoints:  stats.totalPoints,
        totalRebounds: stats.totalRebounds,
        totalAssists:  stats.totalAssists,
        totalSteals:   stats.totalSteals,
        totalBlocks:   stats.totalBlocks,
        totalTurnovers: stats.totalTurnovers,
        totalFieldGoalsMade:    stats.totalFieldGoalsMade,
        totalFieldGoalsAttempted: stats.totalFieldGoalsAttempted,
        totalThreesMade: stats.totalThreesMade,
        totalThreesAttempted: stats.totalThreesAttempted,
        totalFreeThrowsMade:    stats.totalFreeThrowsMade,
        totalFreeThrowsAttempted: stats.totalFreeThrowsAttempted,
        fieldGoalPct:  stats.fieldGoalPct,
        threePointPct: stats.threePointPct,
        freeThrowPct:  stats.freeThrowPct,
      }
    : undefined;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link
        href="/players"
        className="inline-flex items-center gap-1.5 text-sm font-bold border-2 border-foreground/30 text-foreground/80 px-3 py-1.5 hover:border-primary hover:text-primary transition-all"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Players
      </Link>

      {hasStats ? (
        <div className="flex flex-col items-center gap-8">
          <PlayerCard
            profile={cardProfile}
            stats={cardStats}
            careerTotals={cardStats}
            primaryColor={team?.primaryColor ?? "#C85A1B"}
            secondaryColor={team?.secondaryColor ?? "#1E3A5F"}
          />

          {/* Shooting % breakdown */}
          <div className="w-full max-w-sm card-base p-5 space-y-4">
            <p className="label-upper mb-1">Shooting Splits · Career</p>
            <ShootingRow
              label="Field Goals"
              made={stats.totalFieldGoalsMade ?? 0}
              att={stats.totalFieldGoalsAttempted ?? 0}
              pct={stats.fieldGoalPct ?? 0}
              color="#F97316"
            />
            <ShootingRow
              label="3-Pointers"
              made={stats.totalThreesMade ?? 0}
              att={stats.totalThreesAttempted ?? 0}
              pct={stats.threePointPct ?? 0}
              color="#A78BFA"
            />
            <ShootingRow
              label="Free Throws"
              made={stats.totalFreeThrowsMade ?? 0}
              att={stats.totalFreeThrowsAttempted ?? 0}
              pct={stats.freeThrowPct ?? 0}
              color="#34D399"
            />
          </div>

          {/* Defensive & ball stats */}
          <div className="w-full max-w-sm card-base p-5">
            <p className="label-upper mb-3">Defensive &amp; Ball Stats</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "STL", avg: stats.avgSteals.toFixed(1),   total: stats.totalSteals },
                { label: "BLK", avg: stats.avgBlocks.toFixed(1),   total: stats.totalBlocks },
                { label: "TOV", avg: stats.avgTurnovers.toFixed(1), total: stats.totalTurnovers },
              ].map(({ label, avg, total }) => (
                <div key={label} className="rounded-xl bg-muted/40 p-3 text-center">
                  <p className="font-display text-2xl font-black text-primary leading-none">{avg}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{total} total</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header for players with no stats yet */}
          <div className="rounded-2xl overflow-hidden bg-secondary text-white relative">
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background: `radial-gradient(ellipse at top right, ${team?.primaryColor ?? "#C85A1B"}, transparent 60%)`,
              }}
            />
            <div className="relative p-8 md:p-10 flex items-center gap-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center font-display text-4xl text-white flex-shrink-0 shadow-lg"
                style={{ backgroundColor: team?.primaryColor ?? "#C85A1B" }}
              >
                {player.number != null
                  ? `#${player.number}`
                  : `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-4xl md:text-6xl text-white leading-tight">
                  {player.firstName.toUpperCase()} {player.lastName.toUpperCase()}
                </h1>
                <div className="flex flex-wrap gap-3 mt-3">
                  {team && (
                    <Link
                      href={`/teams/${team.id}`}
                      className="bg-white/10 text-white/80 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                      {team.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="card-base p-16 text-center">
            <p className="font-bold text-secondary text-lg mb-1">No Stats Yet</p>
            <p className="text-muted-foreground text-sm">This player hasn't appeared in any games.</p>
          </div>
        </>
      )}
    </div>
  );
}
