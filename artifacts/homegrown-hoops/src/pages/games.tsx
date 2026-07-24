import { useState } from "react";
import { useListGames, useListTeams, useCreateGame, useGetMyProfile } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { CalendarDays, ArrowRight, Plus, X, Save } from "lucide-react";
import { opponentAbbr } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  final: "bg-secondary text-white",
  in_progress: "bg-green-500 text-white",
  scheduled: "bg-muted text-muted-foreground",
  pending: "bg-yellow-600 text-white",
};

function deriveSeason(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

type GameForm = {
  gameDate: string;
  homeTeamId: string;
  awayTeamId: string;
};

const emptyForm: GameForm = {
  gameDate: "",
  homeTeamId: "",
  awayTeamId: "",
};

export function GamesPage() {
  const { isSignedIn } = useUser();
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: teams } = useListTeams();
  const { data: games, isLoading } = useListGames(
    selectedTeamId || selectedSeason
      ? { teamId: selectedTeamId, season: selectedSeason }
      : undefined
  );
  const { data: myProfile } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });

  const isAdmin = myProfile?.role === "admin";
  const createGame = useCreateGame();

  const seasons = [...new Set(games?.map((g) => g.season) ?? [])].sort().reverse();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.homeTeamId || !form.awayTeamId) {
      setFormError("Please select both teams.");
      return;
    }
    if (form.homeTeamId === form.awayTeamId) {
      setFormError("Home and away teams must be different.");
      return;
    }
    if (!form.gameDate) {
      setFormError("Please select a date.");
      return;
    }

    await createGame.mutateAsync({
      data: {
        homeTeamId: parseInt(form.homeTeamId),
        awayTeamId: parseInt(form.awayTeamId),
        gameDate: form.gameDate,
        season: deriveSeason(form.gameDate),
        homeScore: null,
        awayScore: null,
        status: "scheduled",
        location: null,
        notes: null,
      },
    });

    await qc.invalidateQueries({ queryKey: ["/api/games"] });
    setForm(emptyForm);
    setShowForm(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-upper mb-1">Schedule & Results</p>
          <h1 className="font-display text-4xl md:text-5xl text-secondary">
            GAME LOG
          </h1>
          <p className="text-muted-foreground mt-2">Every game, every score</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setForm(emptyForm);
              setFormError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex-shrink-0 mt-1 ${
              showForm
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "btn-primary"
            }`}
          >
            {showForm ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add Game
              </>
            )}
          </button>
        )}
      </div>

      {/* Add Game Form — admin only, no scores at creation time */}
      {isAdmin && showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-base p-6 space-y-5 border-primary/30"
        >
          <div>
            <h2 className="font-display text-xl text-secondary">NEW GAME</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Scores can be entered from the game page after it has been played.
            </p>
          </div>

          <div>
            <label className="label-upper block mb-1.5">Date *</label>
            <input
              type="date"
              name="gameDate"
              value={form.gameDate}
              onChange={handleChange}
              required
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-upper block mb-1.5">Home Team *</label>
              <select
                name="homeTeamId"
                value={form.homeTeamId}
                onChange={handleChange}
                required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
              >
                <option value="">Select home team</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-upper block mb-1.5">Away Team *</label>
              <select
                name="awayTeamId"
                value={form.awayTeamId}
                onChange={handleChange}
                required
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
              >
                <option value="">Select away team</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p className="text-red-600 text-sm font-medium">{formError}</p>
          )}
          {createGame.isError && (
            <p className="text-red-600 text-sm font-medium">
              Failed to save game. Make sure you have admin access.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={createGame.isPending}
              className="btn-primary"
            >
              <Save className="h-4 w-4" />
              {createGame.isPending ? "Saving..." : "Schedule Game"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedTeamId ?? ""}
          onChange={(e) =>
            setSelectedTeamId(
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="border border-border rounded-lg px-4 py-2.5 text-sm font-semibold bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">All Teams</option>
          {teams?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {seasons.length > 0 && (
          <select
            value={selectedSeason ?? ""}
            onChange={(e) => setSelectedSeason(e.target.value || undefined)}
            className="border border-border rounded-lg px-4 py-2.5 text-sm font-semibold bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="">All Seasons</option>
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Game List */}
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
            const homeWon =
              isFinal &&
              game.homeScore != null &&
              game.awayScore != null &&
              game.homeScore > game.awayScore;
            const awayWon =
              isFinal &&
              game.homeScore != null &&
              game.awayScore != null &&
              game.awayScore > game.homeScore;

            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="card-base p-5 flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                {/* Date / status */}
                <div className="w-20 flex-shrink-0">
                  <p className="label-upper text-[10px] mb-1">{game.season}</p>
                  <p className="text-sm font-semibold text-secondary">
                    {game.gameDate}
                  </p>
                  <span
                    className={`inline-block mt-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      statusStyle[game.status] ??
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {game.status === "in_progress" ? "Live" : game.status}
                  </span>
                </div>

                {/* Teams + Scores — score lives inside each team row for perfect alignment */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {[
                    { team: homeTeam, won: homeWon, score: game.homeScore, fallbackName: game.homeTeamId == null ? (game.opponentName ?? "Home") : "Home", fallbackAbbr: game.homeTeamId == null && game.opponentName ? opponentAbbr(game.opponentName) : "HM" },
                    { team: awayTeam, won: awayWon, score: game.awayScore, fallbackName: game.awayTeamId == null ? (game.opponentName ?? "Away") : "Away", fallbackAbbr: game.awayTeamId == null && game.opponentName ? opponentAbbr(game.opponentName) : "?" },
                  ].map(({ team, won, score, fallbackName, fallbackAbbr }) => (
                    <div key={fallbackName} className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-xs text-white flex-shrink-0"
                        style={{
                          background: team
                            ? `linear-gradient(135deg, ${team.secondaryColor ?? "#132237"}, ${team.primaryColor ?? "#888"})`
                            : "#888",
                        }}
                      >
                        {team?.abbreviation ?? fallbackAbbr}
                      </div>
                      <span
                        className={`flex-1 text-sm font-semibold truncate ${
                          won ? "text-secondary" : "text-muted-foreground"
                        }`}
                      >
                        {team?.name ?? fallbackName}
                      </span>
                      <span
                        className={`flex-shrink-0 font-display text-xl leading-none ${
                          won
                            ? "text-primary"
                            : isFinal
                            ? "text-secondary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isFinal ? score : "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Arrow — always at the far right, never between scores */}
                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card-base p-16 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-bold text-secondary text-lg mb-1">No Games Yet</p>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? 'Click "Add Game" above to schedule your first game.'
              : "Check back once games have been scheduled."}
          </p>
        </div>
      )}
    </div>
  );
}
