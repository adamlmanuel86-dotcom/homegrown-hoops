import { useGetStatsSummary, useGetStatLeaders, useListTeams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Trophy, Users, CalendarDays, ArrowRight, TrendingUp, Zap, Target, Share2, ShieldCheck } from "lucide-react";

function CourtTexture() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1000 420"
      preserveAspectRatio="xMaxYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Court outer boundary */}
      <rect x="4" y="4" width="992" height="412" fill="none" stroke="white" strokeWidth="1.5" opacity="0.07" />

      {/* Half-court line */}
      <line x1="500" y1="4" x2="500" y2="416" stroke="white" strokeWidth="1" opacity="0.05" />

      {/* Center circle */}
      <circle cx="500" cy="210" r="55" fill="none" stroke="white" strokeWidth="1.2" opacity="0.05" />
      <circle cx="500" cy="210" r="4" fill="white" opacity="0.05" />

      {/* === RIGHT HALF-COURT (basket on right) === */}

      {/* Three-point arc: center at basket (940,210), radius 240 */}
      {/* Corner top: (940-0, 210-210+240) no... */}
      {/* Corners at x=700, computed y: sqrt(240²-(940-700)²) = sqrt(57600-57600)=0 — exact corner */}
      {/* Use x=710: sqrt(240²-230²)=sqrt(57600-52900)=sqrt(4700)=68.6 → y=210±69 */}
      {/* Corner 3pt lines from baseline at x=992 to x=710 at y=141 and y=279 */}
      <line x1="992" y1="141" x2="710" y2="141" stroke="white" strokeWidth="1.4" opacity="0.07" />
      <line x1="992" y1="279" x2="710" y2="279" stroke="white" strokeWidth="1.4" opacity="0.07" />
      {/* Arc from (710,141) to (710,279) with radius 240, center at basket (940,210) — sweep clockwise */}
      <path d="M 710,141 A 240,240 0 0 1 710,279" fill="none" stroke="white" strokeWidth="1.4" opacity="0.07" />

      {/* Lane / Key: 16ft wide centered, 19ft long */}
      {/* Scaled ~8px/ft: 128px wide, 152px long from baseline */}
      {/* Lane from x=840 to x=992, y=146 to y=274 */}
      <rect x="840" y="146" width="152" height="128" fill="none" stroke="white" strokeWidth="1.3" opacity="0.07" />

      {/* Free throw circle: center at x=840, y=210, radius=55 */}
      <circle cx="840" cy="210" r="55" fill="none" stroke="white" strokeWidth="1.2" opacity="0.07" />

      {/* Free throw line at x=840 */}
      <line x1="840" y1="146" x2="840" y2="274" stroke="white" strokeWidth="1.3" opacity="0.07" />

      {/* Basket & backboard */}
      <line x1="980" y1="196" x2="980" y2="224" stroke="white" strokeWidth="3" opacity="0.09" />
      <circle cx="940" cy="210" r="15" fill="none" stroke="white" strokeWidth="1.2" opacity="0.08" />

      {/* Restricted arc */}
      <path d="M 920,210 A 22,22 0 0 1 960,210" fill="none" stroke="white" strokeWidth="1.1" opacity="0.07" />

      {/* Lane hash marks (top lane) */}
      <line x1="840" y1="162" x2="860" y2="162" stroke="white" strokeWidth="1" opacity="0.06" />
      <line x1="840" y1="180" x2="860" y2="180" stroke="white" strokeWidth="1" opacity="0.06" />
      <line x1="840" y1="198" x2="860" y2="198" stroke="white" strokeWidth="1" opacity="0.06" />
      {/* Lane hash marks (bottom lane) */}
      <line x1="840" y1="258" x2="860" y2="258" stroke="white" strokeWidth="1" opacity="0.06" />
      <line x1="840" y1="240" x2="860" y2="240" stroke="white" strokeWidth="1" opacity="0.06" />
      <line x1="840" y1="222" x2="860" y2="222" stroke="white" strokeWidth="1" opacity="0.06" />

      {/* Orange accent: faint three-point arc overlay */}
      <path d="M 710,141 A 240,240 0 0 1 710,279" fill="none" stroke="#c45c22" strokeWidth="1" opacity="0.12" />
    </svg>
  );
}

function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className="relative overflow-hidden" style={{ height: 48 }} aria-hidden="true">
      <svg
        viewBox="0 0 1440 48"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {flip ? (
          <>
            <path
              d="M0,24 C180,48 360,8 540,28 C720,48 900,10 1080,30 C1260,48 1380,18 1440,24 L1440,0 L0,0 Z"
              fill="hsl(215 50% 17% / 0.06)"
            />
            <path
              d="M0,32 C200,12 400,44 600,24 C800,4 1000,40 1200,20 C1320,8 1400,28 1440,20"
              fill="none"
              stroke="hsl(22 78% 46% / 1)"
              strokeWidth="1"
              opacity="0.18"
            />
          </>
        ) : (
          <>
            <path
              d="M0,16 C200,40 400,4 600,28 C800,48 1000,12 1200,32 C1320,44 1400,20 1440,24 L1440,48 L0,48 Z"
              fill="hsl(215 50% 17% / 0.06)"
            />
            <path
              d="M0,20 C180,44 360,8 540,32 C720,48 920,8 1100,28 C1260,44 1380,16 1440,22"
              fill="none"
              stroke="hsl(22 78% 46% / 1)"
              strokeWidth="1"
              opacity="0.18"
            />
          </>
        )}
      </svg>
    </div>
  );
}

export function Home() {
  const { data: summary, isLoading: loadingSummary } = useGetStatsSummary();
  const { data: leaders, isLoading: loadingLeaders } = useGetStatLeaders();
  const { data: teams } = useListTeams();
  const { user } = useUser();

  const teamById = (id: number) =>
    teams?.find((t) => t.id === id)?.name ?? `Team #${id}`;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-secondary text-white px-8 py-12 md:px-14 md:py-16">
        <CourtTexture />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-16 -top-16 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute -left-10 bottom-0 w-48 h-48 bg-primary/8 rounded-full blur-2xl" />
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

      <WaveDivider />

      {/* League Stats */}
      <section className="mt-6">
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

      <WaveDivider flip />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-6">
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
