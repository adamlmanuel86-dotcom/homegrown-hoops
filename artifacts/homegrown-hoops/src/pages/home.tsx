import { useGetStatsSummary, useGetStatLeaders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Trophy, Users, CalendarDays, ArrowRight, Medal, Flame, Target } from "lucide-react";
import { format } from "date-fns";

export function Home() {
  const { data: summary, isLoading: loadingSummary } = useGetStatsSummary();
  const { data: leaders, isLoading: loadingLeaders } = useGetStatLeaders();
  const { user } = useUser();

  if (loadingSummary || loadingLeaders) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-primary">
          <Trophy className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-primary text-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4 pointer-events-none">
          <Trophy className="h-96 w-96" />
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl md:text-7xl font-display uppercase leading-none mb-4">
            <Show when="signed-in">
              Welcome back, <br/> {user?.firstName || 'Baller'}
            </Show>
            <Show when="signed-out">
              The Courts Are <br/> Calling
            </Show>
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl font-medium mb-8">
            The definitive stats hub for neighborhood leagues and pickup legends. Every bucket, every board, every game.
          </p>
          
          <Show when="signed-out">
            <div className="flex flex-wrap gap-4">
              <Link href="/games" className="bg-black text-white px-6 py-3 font-display uppercase tracking-wider text-xl hover:-translate-y-1 transition-transform inline-flex items-center gap-2">
                Recent Games <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </Show>
          
          <Show when="signed-in">
             <div className="flex flex-wrap gap-4">
              <Link href="/teams" className="bg-white text-black px-6 py-3 font-display uppercase tracking-wider text-xl hover:-translate-y-1 transition-transform inline-flex items-center gap-2 border-2 border-transparent hover:border-black">
                Browse Teams <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </Show>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-6 flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-display text-muted-foreground uppercase">Registered Players</p>
            <p className="text-4xl font-display">{summary?.totalPlayers || 0}</p>
          </div>
        </div>
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-6 flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-display text-muted-foreground uppercase">Active Teams</p>
            <p className="text-4xl font-display">{summary?.totalTeams || 0}</p>
          </div>
        </div>
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-6 flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-display text-muted-foreground uppercase">Games Played</p>
            <p className="text-4xl font-display">{summary?.totalGamesCompleted || 0}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* League Leaders */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b-4 border-black pb-2">
            <h2 className="text-3xl font-display uppercase flex items-center gap-2">
              <Medal className="h-8 w-8 text-primary" />
              League Leaders
            </h2>
            <Link href="/players" className="font-display text-primary hover:underline uppercase text-sm">
              All Players &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Points Leaders */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <div className="bg-black text-white p-3 font-display uppercase flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" /> Points Per Game
              </div>
              <div className="divide-y-2 divide-gray-100">
                {leaders?.points?.slice(0, 5).map((player, i) => (
                  <Link key={player.playerId} href={`/players/${player.playerId}`} className="flex items-center justify-between p-3 hover:bg-gray-50 group">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-xl text-gray-400 group-hover:text-primary w-6 text-center">{i + 1}</span>
                      <div>
                        <p className="font-bold uppercase tracking-tight">{player.firstName} {player.lastName}</p>
                        <p className="text-xs text-muted-foreground uppercase">{player.teamName || 'Free Agent'}</p>
                      </div>
                    </div>
                    <span className="font-display text-2xl">{player.value.toFixed(1)}</span>
                  </Link>
                ))}
                {(!leaders?.points || leaders.points.length === 0) && (
                  <div className="p-4 text-center text-muted-foreground font-medium text-sm uppercase">No data yet</div>
                )}
              </div>
            </div>

            {/* Rebounds Leaders */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <div className="bg-black text-white p-3 font-display uppercase flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Rebounds Per Game
              </div>
              <div className="divide-y-2 divide-gray-100">
                {leaders?.rebounds?.slice(0, 5).map((player, i) => (
                  <Link key={player.playerId} href={`/players/${player.playerId}`} className="flex items-center justify-between p-3 hover:bg-gray-50 group">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-xl text-gray-400 group-hover:text-primary w-6 text-center">{i + 1}</span>
                      <div>
                        <p className="font-bold uppercase tracking-tight">{player.firstName} {player.lastName}</p>
                        <p className="text-xs text-muted-foreground uppercase">{player.teamName || 'Free Agent'}</p>
                      </div>
                    </div>
                    <span className="font-display text-2xl">{player.value.toFixed(1)}</span>
                  </Link>
                ))}
                {(!leaders?.rebounds || leaders.rebounds.length === 0) && (
                  <div className="p-4 text-center text-muted-foreground font-medium text-sm uppercase">No data yet</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Recent Games */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b-4 border-black pb-2">
            <h2 className="text-3xl font-display uppercase flex items-center gap-2">
              <CalendarDays className="h-8 w-8 text-primary" />
              Recent Games
            </h2>
            <Link href="/games" className="font-display text-primary hover:underline uppercase text-sm">
              All Games &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {summary?.recentGames?.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`} className="block bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary group-hover:w-full transition-all duration-300 -z-0 opacity-10"></div>
                <div className="p-4 relative z-10">
                  <div className="flex justify-between items-center mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span>{format(new Date(game.gameDate), 'MMM d, yyyy')}</span>
                    <span className={`px-2 py-1 ${game.status === 'final' ? 'bg-black text-white' : 'bg-primary text-white'}`}>
                      {game.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center font-display text-xl uppercase">
                      <span>Team #{game.awayTeamId}</span>
                      <span className={game.awayScore! > game.homeScore! ? 'text-primary' : ''}>
                        {game.awayScore ?? '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-display text-xl uppercase">
                      <span>Team #{game.homeTeamId}</span>
                      <span className={game.homeScore! > game.awayScore! ? 'text-primary' : ''}>
                        {game.homeScore ?? '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {(!summary?.recentGames || summary.recentGames.length === 0) && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 text-center text-muted-foreground font-medium uppercase">
                No recent games to display
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}