import { useListTeams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Trophy, ShieldAlert, ArrowRight } from "lucide-react";

export function TeamsPage() {
  const { data: teams, isLoading } = useListTeams();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-primary">
          <Trophy className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b-4 border-black pb-4 mb-8">
        <h1 className="text-5xl font-display uppercase flex items-center gap-4">
          <ShieldAlert className="h-10 w-10 text-primary" />
          The League
        </h1>
        <p className="text-xl text-muted-foreground mt-2 font-medium">All active teams in the community</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams?.map((team) => (
          <Link 
            key={team.id} 
            href={`/teams/${team.id}`}
            className="group bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all relative overflow-hidden"
          >
            <div 
              className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full translate-x-1/3 -translate-y-1/3 transition-transform group-hover:scale-150"
              style={{ backgroundColor: team.primaryColor || '#000' }}
            ></div>
            
            <div className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-display uppercase leading-none mb-1">{team.name}</h2>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{team.city}</p>
                </div>
                <div 
                  className="w-12 h-12 flex items-center justify-center font-display text-xl text-white border-2 border-black rotate-3"
                  style={{ backgroundColor: team.primaryColor || '#FF5722' }}
                >
                  {team.abbreviation}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 border-2 border-black p-3 text-center">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Wins</p>
                  <p className="text-3xl font-display text-primary">{team.wins}</p>
                </div>
                <div className="bg-gray-50 border-2 border-black p-3 text-center">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Losses</p>
                  <p className="text-3xl font-display">{team.losses}</p>
                </div>
              </div>

              <div className="flex items-center text-sm font-bold uppercase tracking-wider text-primary group-hover:underline">
                View Roster & Stats <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
        
        {(!teams || teams.length === 0) && (
          <div className="col-span-full bg-gray-50 border-4 border-dashed border-gray-300 p-12 text-center text-muted-foreground font-display text-xl uppercase">
            No teams found in the league
          </div>
        )}
      </div>
    </div>
  );
}