import { useGetTeam, useGetTeamStats, useListPlayers, useListGames } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { Trophy, ChevronLeft, ArrowRight, User } from "lucide-react";
import { format } from "date-fns";

export function TeamDetailPage() {
  const params = useParams();
  const teamId = parseInt(params.id || "0", 10);

  const { data: team, isLoading: loadingTeam } = useGetTeam(teamId, { query: { enabled: !!teamId, queryKey: ['/api/teams', teamId] } });
  const { data: stats, isLoading: loadingStats } = useGetTeamStats(teamId, { query: { enabled: !!teamId, queryKey: ['/api/teams', teamId, 'stats'] } });
  const { data: roster, isLoading: loadingRoster } = useListPlayers({ teamId }, { query: { enabled: !!teamId, queryKey: ['/api/players', { teamId }] } });
  const { data: games, isLoading: loadingGames } = useListGames({ teamId }, { query: { enabled: !!teamId, queryKey: ['/api/games', { teamId }] } });

  if (loadingTeam || loadingStats || loadingRoster || loadingGames) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-primary">
          <Trophy className="h-12 w-12" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center p-12 font-display text-2xl uppercase">Team not found</div>
    );
  }

  return (
    <div className="space-y-8">
      <Link href="/teams" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to League
      </Link>

      {/* Team Header */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-full h-4"
          style={{ backgroundColor: team.primaryColor || '#FF5722' }}
        ></div>
        <div className="p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-12">
          <div className="flex items-center gap-6">
             <div 
                className="w-24 h-24 flex items-center justify-center font-display text-4xl text-white border-4 border-black -rotate-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                style={{ backgroundColor: team.primaryColor || '#FF5722' }}
              >
                {team.abbreviation}
              </div>
            <div>
              <h1 className="text-5xl md:text-7xl font-display uppercase leading-none">{team.name}</h1>
              <p className="text-xl text-muted-foreground font-bold uppercase tracking-widest mt-2">{team.city}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-black text-white p-4 min-w-[100px] text-center border-2 border-black">
              <p className="text-sm font-bold uppercase text-gray-400">Record</p>
              <p className="text-4xl font-display">{team.wins}-{team.losses}</p>
            </div>
            <div className="bg-white text-black p-4 min-w-[100px] text-center border-2 border-black">
              <p className="text-sm font-bold uppercase text-muted-foreground">Games</p>
              <p className="text-4xl font-display">{stats?.totalGames || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Roster & Stats */}
        <div className="lg:col-span-2 space-y-8">
          <section>
             <h2 className="text-3xl font-display uppercase border-b-4 border-black pb-2 mb-6">Team Roster</h2>
             <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[600px]">
                 <thead>
                   <tr className="bg-gray-100 font-display uppercase text-sm border-b-4 border-black">
                     <th className="p-4">No.</th>
                     <th className="p-4">Player</th>
                     <th className="p-4">Pos</th>
                     <th className="p-4">Ht / Wt</th>
                     <th className="p-4 text-right">Profile</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y-2 divide-gray-100">
                   {roster?.map((player) => (
                     <tr key={player.id} className="hover:bg-gray-50 transition-colors group">
                       <td className="p-4 font-display text-xl text-gray-400 group-hover:text-primary">
                         {player.number || '-'}
                       </td>
                       <td className="p-4 font-bold uppercase whitespace-nowrap">
                         <Link href={`/players/${player.id}`} className="hover:underline">
                           {player.firstName} {player.lastName}
                         </Link>
                       </td>
                       <td className="p-4 text-muted-foreground font-bold">{player.position || '-'}</td>
                       <td className="p-4 text-sm font-mono">
                         {player.heightFt ? `${player.heightFt}'${player.heightIn}"` : '-'} / {player.weightLbs ? `${player.weightLbs}lbs` : '-'}
                       </td>
                       <td className="p-4 text-right">
                          <Link href={`/players/${player.id}`} className="inline-flex bg-black text-white p-2 hover:bg-primary transition-colors">
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                       </td>
                     </tr>
                   ))}
                   {(!roster || roster.length === 0) && (
                     <tr>
                       <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold uppercase">No players on roster</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
           <section>
             <h2 className="text-3xl font-display uppercase border-b-4 border-black pb-2 mb-6">Team Averages</h2>
             <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-6 space-y-4">
                <div className="flex justify-between items-center border-b-2 border-gray-100 pb-2">
                  <span className="font-bold uppercase text-muted-foreground">Points For</span>
                  <span className="font-display text-2xl">{stats?.avgPoints?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-gray-100 pb-2">
                  <span className="font-bold uppercase text-muted-foreground">Points Against</span>
                  <span className="font-display text-2xl">{stats?.avgPointsAllowed?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold uppercase text-muted-foreground">Differential</span>
                  <span className={`font-display text-2xl ${((stats?.avgPoints || 0) - (stats?.avgPointsAllowed || 0)) > 0 ? 'text-primary' : ''}`}>
                    {((stats?.avgPoints || 0) - (stats?.avgPointsAllowed || 0)) > 0 ? '+' : ''}{((stats?.avgPoints || 0) - (stats?.avgPointsAllowed || 0)).toFixed(1)}
                  </span>
                </div>
             </div>
           </section>

           <section>
             <h2 className="text-3xl font-display uppercase border-b-4 border-black pb-2 mb-6">Game Log</h2>
             <div className="space-y-3">
               {games?.slice(0, 5).map((game) => {
                 const isHome = game.homeTeamId === teamId;
                 const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
                 const teamScore = isHome ? game.homeScore : game.awayScore;
                 const oppScore = isHome ? game.awayScore : game.homeScore;
                 const isWin = teamScore! > oppScore!;
                 
                 return (
                   <Link key={game.id} href={`/games/${game.id}`} className="block bg-white border-2 border-black p-3 hover:-translate-y-1 transition-transform group">
                     <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase mb-2">
                       <span>{format(new Date(game.gameDate), 'MM/dd')}</span>
                       <span>{game.status}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="font-bold uppercase">{isHome ? 'vs' : '@'} Team {opponentId}</span>
                       {game.status === 'final' && (
                         <div className="flex items-center gap-2">
                           <span className={`w-6 h-6 flex items-center justify-center text-white font-bold text-xs ${isWin ? 'bg-primary' : 'bg-black'}`}>
                             {isWin ? 'W' : 'L'}
                           </span>
                           <span className="font-display text-lg">{teamScore}-{oppScore}</span>
                         </div>
                       )}
                     </div>
                   </Link>
                 );
               })}
               {(!games || games.length === 0) && (
                 <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-6 text-center text-muted-foreground font-bold uppercase text-sm">
                   No games played
                 </div>
               )}
             </div>
           </section>
        </div>
      </div>
    </div>
  );
}