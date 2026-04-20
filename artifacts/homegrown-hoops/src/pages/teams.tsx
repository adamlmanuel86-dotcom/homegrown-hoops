import { useListTeams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, ArrowRight, ShieldCheck } from "lucide-react";

export function TeamsPage() {
  const { data: teams, isLoading } = useListTeams();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="label-upper mb-1">The League</p>
        <h1 className="font-display text-4xl md:text-5xl text-secondary">ALL TEAMS</h1>
        <p className="text-muted-foreground mt-2">Every squad competing this season</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-base p-6 space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-14 bg-muted rounded-lg" />
                <div className="h-14 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : teams?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="card-base p-6 hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-xl text-white flex-shrink-0"
                  style={{ backgroundColor: team.primaryColor ?? "#C85A1B" }}
                >
                  {team.abbreviation}
                </div>
                <div>
                  <h2 className="font-bold text-lg text-secondary leading-tight">{team.name}</h2>
                  <p className="text-sm text-muted-foreground">{team.city}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="label-upper text-[10px] mb-1">W</p>
                  <p className="font-display text-2xl text-secondary">{team.wins}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="label-upper text-[10px] mb-1">L</p>
                  <p className="font-display text-2xl text-secondary">{team.losses}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="label-upper text-[10px] mb-1">PCT</p>
                  <p className="font-display text-2xl text-secondary">
                    {team.wins + team.losses > 0
                      ? (team.wins / (team.wins + team.losses)).toFixed(3).replace(/^0/, "")
                      : ".000"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">View Roster</span>
                <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card-base p-16 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-bold text-secondary text-lg mb-1">No Teams Yet</p>
          <p className="text-muted-foreground text-sm">Teams will appear here once they're added to the league.</p>
        </div>
      )}
    </div>
  );
}
