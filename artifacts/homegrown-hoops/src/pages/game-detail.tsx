import { useRoute, Link } from "wouter";
import { useGetGame, useGetGamePlayerStats, useListTeams, useListPlayers } from "@workspace/api-client-react";
import { ChevronLeft, CalendarDays } from "lucide-react";

export function GameDetailPage() {
  const [, params] = useRoute("/games/:id");
  const id = Number(params?.id);
  const { data: game, isLoading: loadingGame } = useGetGame(id, { query: { enabled: !!id } });
  const { data: playerStats, isLoading: loadingStats } = useGetGamePlayerStats(id, { query: { enabled: !!id } });
  const { data: teams } = useListTeams();
  const { data: players } = useListPlayers();

  const homeTeam = teams?.find((t) => t.id === game?.homeTeamId);
  const awayTeam = teams?.find((t) => t.id === game?.awayTeamId);

  const isFinal = game?.status === "final";
  const homeWon = isFinal && game?.homeScore != null && game?.awayScore != null && game.homeScore > game.awayScore;
  const awayWon = isFinal && game?.homeScore != null && game?.awayScore != null && game.awayScore > game.homeScore;

  const homeStats = playerStats?.filter((s) => players?.find((p) => p.id === s.playerId)?.teamId === game?.homeTeamId) ?? [];
  const awayStats = playerStats?.filter((s) => players?.find((p) => p.id === s.playerId)?.teamId === game?.awayTeamId) ?? [];

  if (loadingGame || loadingStats) {
    return (
      <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-56 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="card-base p-16 text-center max-w-4xl mx-auto">
        <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-bold text-secondary text-lg">Game not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-secondary transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to Games
      </Link>

      {/* Score Card */}
      <div className="rounded-2xl overflow-hidden bg-secondary text-white">
        <div className="flex items-center justify-center gap-1 py-2 px-4 border-b border-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">{game.season}</p>
          {game.location && <p className="text-xs text-white/40 before:content-['·'] before:mx-2">{game.location}</p>}
        </div>

        <div className="grid grid-cols-3 items-center py-10 px-6">
          {/* Away Team */}
          <Link href={awayTeam ? `/teams/${awayTeam.id}` : "#"} className="flex flex-col items-center gap-3 group">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-display text-2xl text-white shadow-lg"
              style={{ backgroundColor: awayTeam?.primaryColor ?? "#555" }}
            >
              {awayTeam?.abbreviation ?? "?"}
            </div>
            <div className="text-center">
              <p className={`font-display text-lg leading-tight group-hover:text-primary transition-colors ${awayWon ? "text-white" : "text-white/60"}`}>
                {awayTeam?.name?.toUpperCase() ?? "AWAY"}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{awayTeam?.city}</p>
            </div>
          </Link>

          {/* Score */}
          <div className="flex flex-col items-center gap-2">
            {isFinal ? (
              <>
                <div className="flex items-center gap-4">
                  <span className={`font-display text-6xl ${awayWon ? "text-primary" : "text-white/90"}`}>{game.awayScore}</span>
                  <span className="font-display text-2xl text-white/30">–</span>
                  <span className={`font-display text-6xl ${homeWon ? "text-primary" : "text-white/90"}`}>{game.homeScore}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">Final · {game.gameDate}</p>
              </>
            ) : (
              <>
                <p className="font-display text-4xl text-white/30">VS</p>
                <p className={`text-xs font-bold uppercase tracking-widest ${game.status === "in_progress" ? "text-green-400" : "text-white/40"}`}>
                  {game.status === "in_progress" ? "Live" : `${game.gameDate}`}
                </p>
              </>
            )}
          </div>

          {/* Home Team */}
          <Link href={homeTeam ? `/teams/${homeTeam.id}` : "#"} className="flex flex-col items-center gap-3 group">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-display text-2xl text-white shadow-lg"
              style={{ backgroundColor: homeTeam?.primaryColor ?? "#555" }}
            >
              {homeTeam?.abbreviation ?? "?"}
            </div>
            <div className="text-center">
              <p className={`font-display text-lg leading-tight group-hover:text-primary transition-colors ${homeWon ? "text-white" : "text-white/60"}`}>
                {homeTeam?.name?.toUpperCase() ?? "HOME"}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{homeTeam?.city}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Box Score */}
      {playerStats && playerStats.length > 0 ? (
        <div className="space-y-6">
          {[
            { label: awayTeam?.name ?? "Away", team: awayTeam, stats: awayStats },
            { label: homeTeam?.name ?? "Home", team: homeTeam, stats: homeStats },
          ].map(({ label, team, stats }) => (
            <div key={label} className="card-base overflow-hidden">
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{ backgroundColor: team?.primaryColor ?? "#C85A1B" }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-display text-sm text-white">
                  {team?.abbreviation ?? "?"}
                </div>
                <p className="font-bold text-white text-sm uppercase tracking-wide">{label}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 label-upper text-[10px]">Player</th>
                      {["PTS", "REB", "AST", "STL", "BLK", "TO", "MIN", "FG", "3P", "FT"].map((col) => (
                        <th key={col} className="px-3 py-3 label-upper text-[10px]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats
                      .sort((a, b) => b.points - a.points)
                      .map((s) => {
                        const player = players?.find((p) => p.id === s.playerId);
                        return (
                          <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              {player ? (
                                <Link href={`/players/${player.id}`} className="font-semibold text-secondary hover:text-primary transition-colors">
                                  {player.firstName} {player.lastName}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">Unknown</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-primary">{s.points}</td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">{s.rebounds}</td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">{s.assists}</td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">{s.steals}</td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">{s.blocks}</td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">{s.turnovers}</td>
                            <td className="px-3 py-3 text-center text-muted-foreground">{s.minutesPlayed}</td>
                            <td className="px-3 py-3 text-center text-muted-foreground">{s.fieldGoalsMade}/{s.fieldGoalsAttempted}</td>
                            <td className="px-3 py-3 text-center text-muted-foreground">{s.threesMade}/{s.threesAttempted}</td>
                            <td className="px-3 py-3 text-center text-muted-foreground">{s.freeThrowsMade}/{s.freeThrowsAttempted}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : isFinal ? (
        <div className="card-base p-12 text-center">
          <p className="font-bold text-secondary text-lg mb-1">No Box Score Data</p>
          <p className="text-muted-foreground text-sm">Player stats weren't recorded for this game.</p>
        </div>
      ) : null}

      {game.notes && (
        <div className="card-base p-5">
          <p className="label-upper mb-2">Notes</p>
          <p className="text-sm text-muted-foreground">{game.notes}</p>
        </div>
      )}
    </div>
  );
}
