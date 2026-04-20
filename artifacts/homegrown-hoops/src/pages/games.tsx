import { useState } from "react";
import { useListGames, useListTeams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { CalendarDays, ArrowRight, Clock, CheckCircle } from "lucide-react";

const statusLabel: Record<string, { label: string; color: string }> = {
  final: { label: "Final", color: "bg-black text-white" },
  in_progress: { label: "Live", color: "bg-green-500 text-white" },
  scheduled: { label: "Scheduled", color: "bg-gray-100 text-black border border-black" },
};

export function GamesPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>();

  const { data: teams } = useListTeams();
  const { data: games, isLoading } = useListGames(
    selectedTeamId || selectedSeason
      ? { teamId: selectedTeamId, season: selectedSeason }
      : undefined
  );

  const seasons = [...new Set(games?.map((g) => g.season) ?? [])].sort().reverse();

  return (
    <div className="space-y-8">
      <div className="border-b-4 border-black pb-4 mb-8">
        <h1 className="text-5xl font-display uppercase flex items-center gap-4">
          <CalendarDays className="h-10 w-10 text-primary" />
          Game Log
        </h1>
        <p className="text-xl text-muted-foreground mt-2 font-medium">Every game, every score</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedTeamId ?? ""}
          onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : undefined)}
          className="border-2 border-black px-4 py-3 font-display uppercase text-sm focus:outline-none focus:border-primary bg-white"
        >
          <option value="">All Teams</option>
          {teams?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={selectedSeason ?? ""}
          onChange={(e) => setSelectedSeason(e.target.value || undefined)}
          className="border-2 border-black px-4 py-3 font-display uppercase text-sm focus:outline-none focus:border-primary bg-white"
        >
          <option value="">All Seasons</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin text-primary">
            <CalendarDays className="h-12 w-12" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {games?.map((game) => {
            const homeTeam = teams?.find((t) => t.id === game.homeTeamId);
            const awayTeam = teams?.find((t) => t.id === game.awayTeamId);
            const status = statusLabel[game.status] ?? { label: game.status, color: "bg-gray-100 text-black" };
            const isFinal = game.status === "final";
            const homeWon = isFinal && game.homeScore != null && game.awayScore != null && game.homeScore > game.awayScore;
            const awayWon = isFinal && game.homeScore != null && game.awayScore != null && game.awayScore > game.homeScore;

            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="group bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Date & Status */}
                  <div className="sm:w-40 flex-shrink-0">
                    <p className="text-xs font-bold uppercase text-muted-foreground">{game.season}</p>
                    <p className="font-display text-sm mt-1">{game.gameDate}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-bold uppercase ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Teams & Score */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className={`flex items-center gap-3 ${homeWon ? "font-bold" : ""}`}>
                        <div
                          className="w-8 h-8 flex items-center justify-center border-2 border-black text-white font-display text-xs"
                          style={{ backgroundColor: homeTeam?.primaryColor ?? "#888" }}
                        >
                          {homeTeam?.abbreviation ?? "?"}
                        </div>
                        <span className="font-display uppercase text-base sm:text-lg">
                          {homeTeam?.name ?? "Home"}
                        </span>
                      </div>
                      <div className="text-xl font-display">
                        {isFinal ? (
                          <span className={homeWon ? "text-primary" : ""}>{game.homeScore}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-2">
                      <div className={`flex items-center gap-3 ${awayWon ? "font-bold" : ""}`}>
                        <div
                          className="w-8 h-8 flex items-center justify-center border-2 border-black text-white font-display text-xs"
                          style={{ backgroundColor: awayTeam?.primaryColor ?? "#888" }}
                        >
                          {awayTeam?.abbreviation ?? "?"}
                        </div>
                        <span className="font-display uppercase text-base sm:text-lg">
                          {awayTeam?.name ?? "Away"}
                        </span>
                      </div>
                      <div className="text-xl font-display">
                        {isFinal ? (
                          <span className={awayWon ? "text-primary" : ""}>{game.awayScore}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location & Arrow */}
                  <div className="sm:w-40 flex-shrink-0 flex sm:flex-col items-end justify-between gap-2">
                    {game.location && (
                      <p className="text-xs text-muted-foreground text-right leading-snug hidden sm:block">{game.location}</p>
                    )}
                    <ArrowRight className="h-4 w-4 text-primary ml-auto transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}

          {(!games || games.length === 0) && (
            <div className="bg-gray-50 border-4 border-dashed border-gray-300 p-12 text-center text-muted-foreground font-display text-xl uppercase">
              No games found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
