import { useState } from "react";
import { useListTeams, useListPlayers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, ArrowRight, Search } from "lucide-react";

export function PlayersPage() {
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();
  const { data: teams } = useListTeams();
  const { data: players, isLoading } = useListPlayers(selectedTeamId ? { teamId: selectedTeamId } : undefined);

  const filtered = players?.filter((p) =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="label-upper mb-1">The Roster</p>
        <h1 className="font-display text-4xl md:text-5xl text-secondary">ALL PLAYERS</h1>
        <p className="text-muted-foreground mt-2">Every baller in the league</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
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
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card-base p-4 flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((player) => {
            const team = teams?.find((t) => t.id === player.teamId);
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="card-base p-4 flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-lg text-white flex-shrink-0"
                  style={{ backgroundColor: team?.primaryColor ?? "#C85A1B" }}
                >
                  {player.number ?? "#"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-secondary text-sm leading-tight">
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {player.position ?? "—"} · {team?.abbreviation ?? "FA"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card-base p-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-bold text-secondary text-lg mb-1">No Players Found</p>
          <p className="text-muted-foreground text-sm">
            {search ? "Try a different search." : "Players will appear here once added."}
          </p>
        </div>
      )}
    </div>
  );
}
