import { useRoute, Link } from "wouter";
import { useGetGame, useGetGamePlayerStats, useListTeams, useListPlayers } from "@workspace/api-client-react";
import { ArrowLeft, Trophy } from "lucide-react";

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

  const homePlayerStats = playerStats?.filter((s) => {
    const player = players?.find((p) => p.id === s.playerId);
    return player?.teamId === game?.homeTeamId;
  });
  const awayPlayerStats = playerStats?.filter((s) => {
    const player = players?.find((p) => p.id === s.playerId);
    return player?.teamId === game?.awayTeamId;
  });

  if (loadingGame || loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-primary">
          <Trophy className="h-12 w-12" />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-24 font-display text-2xl uppercase text-muted-foreground">
        Game not found
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/games" className="inline-flex items-center gap-2 font-display uppercase text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Games
      </Link>

      {/* Score Banner */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-2 text-center bg-black text-white">
          <span className="font-display uppercase text-xs tracking-widest">{game.season}</span>
        </div>
        <div className="grid grid-cols-3 items-center">
          {/* Home Team */}
          <div className={`p-6 text-center border-r-4 border-black ${homeWon ? "bg-primary/10" : ""}`}>
            <div
              className="w-12 h-12 mx-auto flex items-center justify-center border-2 border-black text-white font-display text-sm mb-3"
              style={{ backgroundColor: homeTeam?.primaryColor ?? "#888" }}
            >
              {homeTeam?.abbreviation}
            </div>
            <Link href={`/teams/${homeTeam?.id}`} className="font-display uppercase text-xl leading-none hover:text-primary transition-colors">
              {homeTeam?.name ?? "Home"}
            </Link>
            <p className="text-xs text-muted-foreground font-bold uppercase mt-1">Home</p>
          </div>

          {/* Score */}
          <div className="p-6 text-center">
            {isFinal ? (
              <>
                <div className="text-5xl font-display">
                  <span className={homeWon ? "text-primary" : ""}>{game.homeScore}</span>
                  <span className="mx-3 text-muted-foreground text-2xl">—</span>
                  <span className={awayWon ? "text-primary" : ""}>{game.awayScore}</span>
                </div>
                <p className="font-bold uppercase text-xs text-muted-foreground mt-2">Final</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-display text-muted-foreground">vs</p>
                <p className="font-bold uppercase text-xs mt-2 text-green-600">
                  {game.status === "in_progress" ? "Live" : "Scheduled"}
                </p>
              </>
            )}
            <p className="text-xs text-muted-foreground mt-3">{game.gameDate}</p>
          </div>

          {/* Away Team */}
          <div className={`p-6 text-center border-l-4 border-black ${awayWon ? "bg-primary/10" : ""}`}>
            <div
              className="w-12 h-12 mx-auto flex items-center justify-center border-2 border-black text-white font-display text-sm mb-3"
              style={{ backgroundColor: awayTeam?.primaryColor ?? "#888" }}
            >
              {awayTeam?.abbreviation}
            </div>
            <Link href={`/teams/${awayTeam?.id}`} className="font-display uppercase text-xl leading-none hover:text-primary transition-colors">
              {awayTeam?.name ?? "Away"}
            </Link>
            <p className="text-xs text-muted-foreground font-bold uppercase mt-1">Away</p>
          </div>
        </div>

        {game.location && (
          <div className="border-t-4 border-black p-3 text-center bg-gray-50">
            <p className="text-xs font-bold uppercase text-muted-foreground">{game.location}</p>
          </div>
        )}
      </div>

      {/* Box Score */}
      {playerStats && playerStats.length > 0 && (
        <div className="space-y-6">
          {[
            { label: homeTeam?.name ?? "Home", team: homeTeam, stats: homePlayerStats ?? [] },
            { label: awayTeam?.name ?? "Away", team: awayTeam, stats: awayPlayerStats ?? [] },
          ].map(({ label, team, stats }) => (
            <div key={label} className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <div
                className="p-4 font-display uppercase text-lg text-white"
                style={{ backgroundColor: team?.primaryColor ?? "#888" }}
              >
                {label} — Box Score
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b-2 border-black bg-gray-50">
                      <th className="text-left p-3 font-bold uppercase text-xs">Player</th>
                      <th className="p-3 font-bold uppercase text-xs">PTS</th>
                      <th className="p-3 font-bold uppercase text-xs">REB</th>
                      <th className="p-3 font-bold uppercase text-xs">AST</th>
                      <th className="p-3 font-bold uppercase text-xs">STL</th>
                      <th className="p-3 font-bold uppercase text-xs">BLK</th>
                      <th className="p-3 font-bold uppercase text-xs">TO</th>
                      <th className="p-3 font-bold uppercase text-xs">MIN</th>
                      <th className="p-3 font-bold uppercase text-xs">FG</th>
                      <th className="p-3 font-bold uppercase text-xs">3P</th>
                      <th className="p-3 font-bold uppercase text-xs">FT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats
                      .sort((a, b) => b.points - a.points)
                      .map((s) => {
                        const player = players?.find((p) => p.id === s.playerId);
                        const fgPct = s.fieldGoalsAttempted > 0 ? Math.round((s.fieldGoalsMade / s.fieldGoalsAttempted) * 100) : 0;
                        return (
                          <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              {player ? (
                                <Link href={`/players/${player.id}`} className="font-display uppercase hover:text-primary transition-colors">
                                  {player.firstName} {player.lastName}
                                </Link>
                              ) : (
                                <span className="font-display uppercase text-muted-foreground">Unknown</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-primary">{s.points}</td>
                            <td className="p-3 text-center">{s.rebounds}</td>
                            <td className="p-3 text-center">{s.assists}</td>
                            <td className="p-3 text-center">{s.steals}</td>
                            <td className="p-3 text-center">{s.blocks}</td>
                            <td className="p-3 text-center">{s.turnovers}</td>
                            <td className="p-3 text-center">{s.minutesPlayed}</td>
                            <td className="p-3 text-center">{s.fieldGoalsMade}/{s.fieldGoalsAttempted}</td>
                            <td className="p-3 text-center">{s.threesMade}/{s.threesAttempted}</td>
                            <td className="p-3 text-center">{s.freeThrowsMade}/{s.freeThrowsAttempted}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!playerStats || playerStats.length === 0) && isFinal && (
        <div className="bg-gray-50 border-4 border-dashed border-gray-300 p-12 text-center text-muted-foreground font-display uppercase text-xl">
          No player stats recorded for this game
        </div>
      )}

      {game.notes && (
        <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <p className="font-bold uppercase text-xs text-muted-foreground mb-2">Notes</p>
          <p className="text-base">{game.notes}</p>
        </div>
      )}
    </div>
  );
}
