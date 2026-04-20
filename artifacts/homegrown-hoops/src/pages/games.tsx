import { useState } from "react";
import { useListGames, useListTeams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { CalendarDays, ArrowRight } from "lucide-react";

const statusStyle: Record<string, string> = {
  final: "bg-secondary text-white",
  in_progress: "bg-green-500 text-white",
  scheduled: "bg-muted text-muted-foreground",
};

export function GamesPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>();

  const { data: teams } = useListTeams();
  const { data: games, isLoading } = useListGames(
    selectedTeamId || selectedSeason ? { teamId: selectedTeamId, season: selectedSeason } : undefined
  );

  const seasons = [...new Set(games?.map((g) => g.season) ?? [])].sort().reverse();

  return (
    <div className="space-y-8">
      <div>
        <p className="label-upper mb-1">Schedule & Results</p>
        <h1 className="font-display text-4xl md:text-5xl text-secondary">GAME LOG</h1>
        <p className="text-muted-foreground mt-2">Every game, every score</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedTeamId ?? ""}
          onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : undefined)}
          className="border border-border rounded-lg px-4 py-2.5 text-sm font-semibold bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">All Teams</option>
          {teams?.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {seasons.length > 0 && (
          <select
            value={selectedSeason ?? ""}
            onChange={(e) => setSelectedSeason(e.target.value || undefined)}
            className="border border-border rounded-lg px-4 py-2.5 text-sm font-semibold bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="">All Seasons</option>
            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-base p-5 animate-pulse">
              <div className="flex items-center gap-5">
                <div className="w-20 space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted" />
                      <div className="h-4 bg-muted rounded w-32" />
                    </div>
                    <div className="h-6 bg-muted rounded w-8" />
                  </div>
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted" />
                      <div className="h-4 bg-muted rounded w-28" />
                    </div>
                    <div className="h-6 bg-muted rounded w-8" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : games?.length ? (
        <div className="space-y-3">
          {games.map((game) => {
            const homeTeam = teams?.find((t) => t.id === game.homeTeamId);
            const awayTeam = teams?.find((t) => t.id === game.awayTeamId);
            const isFinal = game.status === "final";
            const homeWon = isFinal && game.homeScore != null && game.awayScore != null && game.homeScore > game.awayScore;
            const awayWon = isFinal && game.homeScore != null && game.awayScore != null && game.awayScore > game.homeScore;

            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="card-base p-5 flex items-center gap-5 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                {/* Meta */}
                <div className="w-24 flex-shrink-0">
                  <p className="label-upper text-[10px] mb-1">{game.season}</p>
                  <p className="text-sm font-semibold text-secondary">{game.gameDate}</p>
                  <span className={`inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusStyle[game.status] ?? "bg-muted text-muted-foreground"}`}>
                    {game.status === "in_progress" ? "Live" : game.status}
                  </span>
                </div>

                {/* Teams & Score */}
                <div className="flex-1 space-y-2.5">
                  {[
                    { team: homeTeam, score: game.homeScore, won: homeWon },
                    { team: awayTeam, score: game.awayScore, won: awayWon },
                  ].map(({ team, score, won }, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-xs text-white flex-shrink-0"
                          style={{ backgroundColor: team?.primaryColor ?? "#888" }}
                        >
                          {team?.abbreviation ?? "?"}
                        </div>
                        <span className={`text-sm font-semibold ${won ? "text-secondary font-bold" : "text-muted-foreground"}`}>
                          {team?.name ?? (idx === 0 ? "Home" : "Away")}
                        </span>
                      </div>
                      <span className={`font-display text-xl ${won ? "text-primary" : isFinal ? "text-secondary" : "text-muted-foreground"}`}>
                        {isFinal ? score : "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Location + Arrow */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {game.location && (
                    <p className="text-xs text-muted-foreground text-right hidden sm:block max-w-[100px] leading-snug">{game.location}</p>
                  )}
                  <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card-base p-16 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-bold text-secondary text-lg mb-1">No Games Yet</p>
          <p className="text-muted-foreground text-sm">Check back once games have been scheduled.</p>
        </div>
      )}
    </div>
  );
}
