import { useGetTeam, useGetTeamStats, useListPlayers, useListGames } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { Trophy, ChevronLeft, ArrowRight } from "lucide-react";

export function TeamDetailPage() {
  const params = useParams();
  const teamId = parseInt(params.id || "0", 10);

  const { data: team, isLoading: loadingTeam } = useGetTeam(teamId, { query: { enabled: !!teamId } });
  const { data: stats } = useGetTeamStats(teamId, { query: { enabled: !!teamId } });
  const { data: roster, isLoading: loadingRoster } = useListPlayers({ teamId }, { query: { enabled: !!teamId } });
  const { data: games } = useListGames({ teamId }, { query: { enabled: !!teamId } });

  if (loadingTeam) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="card-base p-16 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-bold text-secondary text-lg">Team not found</p>
      </div>
    );
  }

  const winPct = team.wins + team.losses > 0
    ? (team.wins / (team.wins + team.losses)).toFixed(3).replace(/^0/, "")
    : ".000";

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link href="/teams" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-secondary transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to Teams
      </Link>

      {/* Team Banner */}
      <div className="rounded-2xl overflow-hidden bg-secondary text-white relative">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at top right, ${team.primaryColor ?? "#C85A1B"}, transparent 60%)`,
          }}
        />
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center font-display text-3xl text-white flex-shrink-0 shadow-lg"
            style={{ backgroundColor: team.primaryColor ?? "#C85A1B" }}
          >
            {team.abbreviation}
          </div>
          <div className="flex-1">
            <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-1">{team.city}</p>
            <h1 className="font-display text-4xl md:text-6xl text-white leading-tight">{team.name.toUpperCase()}</h1>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="label-upper text-white/50 mb-1">Record</p>
              <p className="font-display text-4xl text-white">{team.wins}–{team.losses}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="label-upper text-white/50 mb-1">PCT</p>
              <p className="font-display text-4xl text-white">{winPct}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Roster */}
        <div className="lg:col-span-2 space-y-5">
          <h2 className="font-bold text-lg text-secondary">Roster</h2>
          {loadingRoster ? (
            <div className="card-base divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : roster?.length ? (
            <div className="card-base divide-y divide-border overflow-hidden">
              {roster.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors group"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-display text-sm text-white flex-shrink-0"
                    style={{ backgroundColor: team.primaryColor ?? "#C85A1B" }}
                  >
                    {player.number ?? "#"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-secondary text-sm">{player.firstName} {player.lastName}</p>
                    <p className="text-xs text-muted-foreground">{player.position ?? "—"}</p>
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {player.heightFt != null ? `${player.heightFt}'${player.heightIn ?? 0}"` : ""}
                    {player.weightLbs != null ? ` / ${player.weightLbs} lbs` : ""}
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="card-base p-10 text-center text-sm text-muted-foreground">
              No players on roster
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Team Averages */}
          <div className="card-base overflow-hidden">
            <div className="bg-secondary px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Team Averages</p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "Points For", value: stats?.avgPoints?.toFixed(1) ?? "—" },
                { label: "Points Against", value: stats?.avgPointsAllowed?.toFixed(1) ?? "—" },
                {
                  label: "Differential",
                  value: stats
                    ? `${((stats.avgPoints ?? 0) - (stats.avgPointsAllowed ?? 0)) > 0 ? "+" : ""}${((stats.avgPoints ?? 0) - (stats.avgPointsAllowed ?? 0)).toFixed(1)}`
                    : "—",
                  highlight: stats && (stats.avgPoints ?? 0) > (stats.avgPointsAllowed ?? 0),
                },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground font-medium">{label}</span>
                  <span className={`font-display text-xl ${highlight ? "text-primary" : "text-secondary"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Games */}
          <div className="card-base overflow-hidden">
            <div className="bg-secondary px-4 py-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Recent Games</p>
              <Link href="/games" className="text-xs text-primary font-semibold hover:underline">All →</Link>
            </div>
            <div className="divide-y divide-border">
              {games?.slice(0, 5).map((game) => {
                const isHome = game.homeTeamId === teamId;
                const teamScore = isHome ? game.homeScore : game.awayScore;
                const oppScore = isHome ? game.awayScore : game.homeScore;
                const isFinal = game.status === "final";
                const isWin = isFinal && teamScore != null && oppScore != null && teamScore > oppScore;

                return (
                  <Link
                    key={game.id}
                    href={`/games/${game.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="label-upper text-[10px]">{game.gameDate}</p>
                      <p className="text-sm font-semibold text-secondary mt-0.5">
                        {isHome ? "vs" : "@"} #{isHome ? game.awayTeamId : game.homeTeamId}
                      </p>
                    </div>
                    {isFinal ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center text-white ${isWin ? "bg-primary" : "bg-muted-foreground"}`}
                        >
                          {isWin ? "W" : "L"}
                        </span>
                        <span className="font-display text-base text-secondary">{teamScore}–{oppScore}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-primary uppercase">{game.status}</span>
                    )}
                  </Link>
                );
              })}
              {(!games || games.length === 0) && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No games yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
