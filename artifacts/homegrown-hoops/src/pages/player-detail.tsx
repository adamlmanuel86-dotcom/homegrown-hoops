import { useRoute, Link } from "wouter";
import { useGetPlayer, useGetPlayerStats, useListTeams } from "@workspace/api-client-react";
import { ArrowLeft, User, Trophy } from "lucide-react";

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 border-2 border-black p-4 text-center">
      <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">{label}</p>
      <p className="text-2xl font-display text-foreground mt-1">{value}</p>
    </div>
  );
}

export function PlayerDetailPage() {
  const [, params] = useRoute("/players/:id");
  const id = Number(params?.id);
  const { data: player, isLoading: loadingPlayer } = useGetPlayer(id, { query: { enabled: !!id } });
  const { data: stats, isLoading: loadingStats } = useGetPlayerStats(id, { query: { enabled: !!id } });
  const { data: teams } = useListTeams();

  const team = teams?.find((t) => t.id === player?.teamId);

  if (loadingPlayer || loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-primary">
          <Trophy className="h-12 w-12" />
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-24 font-display text-2xl uppercase text-muted-foreground">
        Player not found
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/players" className="inline-flex items-center gap-2 font-display uppercase text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Players
      </Link>

      {/* Player Header */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden">
        <div
          className="p-8 text-white flex items-center gap-6"
          style={{ backgroundColor: team?.primaryColor ?? "#FF5722" }}
        >
          <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center border-4 border-white bg-black/20 font-display text-4xl text-white">
            {player.number ?? "#"}
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-display uppercase leading-none">
              {player.firstName} {player.lastName}
            </h1>
            <div className="flex flex-wrap gap-3 mt-3 text-sm font-bold uppercase tracking-widest opacity-90">
              {player.position && <span>{player.position}</span>}
              {team && (
                <Link href={`/teams/${team.id}`} className="underline hover:no-underline">
                  {team.name}
                </Link>
              )}
              {!team && <span>Free Agent</span>}
            </div>
          </div>
        </div>

        {/* Physical info */}
        <div className="p-6 flex flex-wrap gap-6 border-t-4 border-black">
          {player.heightFt != null && player.heightIn != null && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Height</p>
              <p className="text-xl font-display">{player.heightFt}'{player.heightIn}"</p>
            </div>
          )}
          {player.weightLbs != null && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Weight</p>
              <p className="text-xl font-display">{player.weightLbs} lbs</p>
            </div>
          )}
          {player.bio && (
            <div className="w-full">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Bio</p>
              <p className="text-base text-foreground">{player.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Career Stats */}
      <div>
        <h2 className="text-3xl font-display uppercase border-b-4 border-black pb-3 mb-6">Career Averages</h2>
        {stats && stats.gamesPlayed > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
              <StatBox label="PPG" value={stats.avgPoints} />
              <StatBox label="RPG" value={stats.avgRebounds} />
              <StatBox label="APG" value={stats.avgAssists} />
              <StatBox label="SPG" value={stats.avgSteals} />
              <StatBox label="BPG" value={stats.avgBlocks} />
              <StatBox label="TPG" value={stats.avgTurnovers} />
              <StatBox label="MPG" value={stats.avgMinutes} />
              <StatBox label="Games" value={stats.gamesPlayed} />
            </div>

            <h3 className="text-xl font-display uppercase border-b-2 border-black pb-2 mb-4">Shooting</h3>
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="FG%" value={`${stats.fieldGoalPct}%`} />
              <StatBox label="3P%" value={`${stats.threePointPct}%`} />
              <StatBox label="FT%" value={`${stats.freeThrowPct}%`} />
            </div>
          </>
        ) : (
          <div className="bg-gray-50 border-4 border-dashed border-gray-300 p-12 text-center text-muted-foreground font-display uppercase text-xl">
            No stats yet
          </div>
        )}
      </div>
    </div>
  );
}
