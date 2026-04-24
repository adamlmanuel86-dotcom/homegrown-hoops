import { useRoute, Link } from "wouter";
import { useGetPlayer, useGetPlayerStats, useListTeams } from "@workspace/api-client-react";
import { ChevronLeft, User } from "lucide-react";

function StatBox({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="card-base p-4 text-center">
      <p className="label-upper text-[10px] mb-2">{label}</p>
      <p className={`font-display text-3xl ${highlight ? "text-primary" : "text-secondary"}`}>{value}</p>
    </div>
  );
}

export function PlayerDetailPage() {
  const [, params] = useRoute("/players/:id");
  const id = Number(params?.id);
  const { data: player, isLoading } = useGetPlayer(id, { query: { enabled: !!id } });
  const { data: stats } = useGetPlayerStats(id, { query: { enabled: !!id } });
  const { data: teams } = useListTeams();

  const team = teams?.find((t) => t.id === player?.teamId);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-52 bg-muted rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/players" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-secondary transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to Players
      </Link>

      {/* Player Banner */}
      <div className="rounded-2xl overflow-hidden bg-secondary text-white relative">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(ellipse at top right, ${team?.primaryColor ?? "#C85A1B"}, transparent 60%)`,
          }}
        />
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center font-display text-4xl text-white flex-shrink-0 shadow-lg"
            style={{ backgroundColor: team?.primaryColor ?? "#C85A1B" }}
          >
            {player.number != null ? `#${player.number}` : `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-6xl text-white leading-tight">
              {player.firstName.toUpperCase()} {player.lastName.toUpperCase()}
            </h1>
            <div className="flex flex-wrap gap-3 mt-3">
              {player.position && (
                <span className="bg-white/10 text-white/80 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  {player.position}
                </span>
              )}
              {team ? (
                <Link
                  href={`/teams/${team.id}`}
                  className="bg-white/10 text-white/80 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  {team.name}
                </Link>
              ) : (
                <span className="bg-white/10 text-white/80 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Free Agent
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-5 flex-shrink-0">
            {player.heightFt != null && (
              <div className="text-center">
                <p className="label-upper text-white/50 mb-1">Height</p>
                <p className="font-display text-2xl">{player.heightFt}'{player.heightIn ?? 0}"</p>
              </div>
            )}
            {player.weightLbs != null && (
              <div className="text-center">
                <p className="label-upper text-white/50 mb-1">Weight</p>
                <p className="font-display text-2xl">{player.weightLbs}<span className="text-sm font-sans text-white/50 ml-1">lbs</span></p>
              </div>
            )}
          </div>
        </div>
        {player.bio && (
          <div className="relative px-8 md:px-10 pb-6 text-white/60 text-sm">{player.bio}</div>
        )}
      </div>

      {/* Stats */}
      {stats && stats.gamesPlayed > 0 ? (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-secondary">Career Averages</h2>
              <span className="label-upper">{stats.gamesPlayed} GP</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="PPG" value={stats.avgPoints} highlight />
              <StatBox label="RPG" value={stats.avgRebounds} />
              <StatBox label="APG" value={stats.avgAssists} />
              <StatBox label="SPG" value={stats.avgSteals} />
              <StatBox label="BPG" value={stats.avgBlocks} />
              <StatBox label="TPG" value={stats.avgTurnovers} />
              <StatBox label="MPG" value={stats.avgMinutes} />
            </div>
          </div>

          <div>
            <h3 className="font-bold text-secondary mb-4">Shooting</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "FG%", value: `${stats.fieldGoalPct}%` },
                { label: "3PT%", value: `${stats.threePointPct}%` },
                { label: "FT%", value: `${stats.freeThrowPct}%` },
              ].map(({ label, value }) => (
                <div key={label} className="card-base p-5 text-center">
                  <p className="label-upper text-[10px] mb-2">{label}</p>
                  <p className="font-display text-4xl text-secondary">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card-base p-16 text-center">
          <p className="font-bold text-secondary text-lg mb-1">No Stats Yet</p>
          <p className="text-muted-foreground text-sm">This player hasn't appeared in any games.</p>
        </div>
      )}
    </div>
  );
}
