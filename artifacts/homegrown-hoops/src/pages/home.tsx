import { useGetStatsSummary, useGetStatLeaders, useListTeams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Trophy, Users, CalendarDays, ArrowRight, TrendingUp, Zap, Target, Share2, ShieldCheck } from "lucide-react";

export function Home() {
  const { data: summary, isLoading: loadingSummary } = useGetStatsSummary();
  const { data: leaders, isLoading: loadingLeaders } = useGetStatLeaders();
  const { data: teams } = useListTeams();
  const { user } = useUser();

  const teamById = (id: number) =>
    teams?.find((t) => t.id === id)?.name ?? `Team #${id}`;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-secondary text-white px-8 py-12 md:px-14 md:py-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-16 -top-16 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -left-10 bottom-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground/90 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-5">
            <Zap className="h-3 w-3 text-primary" />
            Community League Tracker
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.9] mb-5 text-white">
            <Show when="signed-in">
              WELCOME BACK,{" "}
              <span className="text-primary">{(user?.firstName || "BALLER").toUpperCase()}</span>
            </Show>
            <Show when="signed-out">
              EVERY BUCKET. <br />
              <span className="text-primary">EVERY GAME.</span>
            </Show>
          </h1>
          <p className="text-white/70 text-lg max-w-md mb-8">
            The definitive stats hub for neighborhood leagues and pickup legends.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/games" className="btn-primary text-base px-6 py-3">
              View Games <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/teams" className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-6 py-3 font-bold text-base transition-colors inline-flex items-center gap-2">
              Browse Teams
            </Link>
          </div>
        </div>
      </section>

      {/* League Stats */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">League Overview</h2>
        <div className="grid grid-cols-3 gap-3 md:gap-5">
          {[
            { icon: Users, label: "Players", value: summary?.totalPlayers ?? 0, loading: loadingSummary },
            { icon: Trophy, label: "Teams", value: summary?.totalTeams ?? 0, loading: loadingSummary },
            { icon: CalendarDays, label: "Games Played", value: summary?.totalGamesCompleted ?? 0, loading: loadingSummary },
          ].map(({ icon: Icon, label, value, loading }) => (
            <div key={label} className="card-base p-5 md:p-6">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="label-upper mb-1">{label}</p>
              {loading ? (
                <div className="h-10 w-12 rounded-md bg-muted animate-pulse" />
              ) : (
                <p className="stat-number text-secondary">{value}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* League Leaders */}
        <section className="lg:col-span-3 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg text-secondary">League Leaders</h2>
            </div>
            <Link href="/players" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              All Players <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { key: "points"   as const, label: "Points",   abbr: "PPG", icon: Trophy },
              { key: "rebounds" as const, label: "Rebounds",  abbr: "RPG", icon: Target },
              { key: "assists"  as const, label: "Assists",   abbr: "APG", icon: Share2 },
              { key: "steals"   as const, label: "Steals",    abbr: "SPG", icon: Zap },
              { key: "blocks"   as const, label: "Blocks",    abbr: "BPG", icon: ShieldCheck },
            ] as const).map(({ key, label, abbr, icon: Icon }) => {
              const top = leaders?.[key]?.[0];
              return (
                <div key={key} className="card-base overflow-hidden flex flex-col">
                  <div className="bg-secondary px-4 py-2.5 flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">{label}</p>
                  </div>
                  {loadingLeaders ? (
                    <div className="flex-1 p-4 space-y-2 animate-pulse">
                      <div className="h-7 w-16 rounded bg-muted" />
                      <div className="h-4 w-24 rounded bg-muted" />
                      <div className="h-3 w-16 rounded bg-muted" />
                    </div>
                  ) : top ? (
                    <Link
                      href={`/players/${top.playerId}`}
                      className="flex-1 p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <p className="font-display text-3xl text-primary leading-none mb-2">
                        {top.value.toFixed(1)}
                        <span className="text-xs font-sans font-bold text-muted-foreground ml-1">{abbr}</span>
                      </p>
                      <p className="text-sm font-bold text-secondary leading-tight group-hover:text-primary transition-colors">
                        {top.firstName} {top.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{top.teamName || "Free Agent"}</p>
                    </Link>
                  ) : (
                    <div className="flex-1 p-4 text-xs text-muted-foreground">No data yet</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Games */}
        <section className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg text-secondary">Recent Games</h2>
            </div>
            <Link href="/games" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              All Games <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {loadingSummary ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-base p-4 space-y-2">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-5 w-full rounded bg-muted animate-pulse" />
                  <div className="h-5 w-full rounded bg-muted animate-pulse" />
                </div>
              ))
            ) : summary?.recentGames?.length ? (
              summary.recentGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="card-base p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="label-upper">{game.gameDate}</p>
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${game.status === "final" ? "bg-secondary text-white" : "bg-primary/10 text-primary"}`}>
                        {game.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-semibold">
                        <span>{teamById(game.awayTeamId)}</span>
                        <span className="font-display text-base">{game.awayScore ?? "—"}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span>{teamById(game.homeTeamId)}</span>
                        <span className="font-display text-base">{game.homeScore ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              ))
            ) : (
              <div className="card-base p-10 text-center text-muted-foreground text-sm">
                No games yet
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
