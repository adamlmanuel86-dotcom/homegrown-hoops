import { useState } from "react";
import { useListTeams, useListPlayers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, ArrowRight, Search } from "lucide-react";

export function PlayersPage() {
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();
  const { data: teams } = useListTeams();
  const { data: players, isLoading } = useListPlayers(selectedTeamId ? { teamId: selectedTeamId } : undefined);

  const filtered = players?.filter((p) => {
    const name = `${p.firstName} ${p.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="border-b-4 border-black pb-4 mb-8">
        <h1 className="text-5xl font-display uppercase flex items-center gap-4">
          <Users className="h-10 w-10 text-primary" />
          Players
        </h1>
        <p className="text-xl text-muted-foreground mt-2 font-medium">Every player in the league</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-black font-medium focus:outline-none focus:border-primary"
          />
        </div>
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin text-primary">
            <Users className="h-12 w-12" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((player) => {
            const team = teams?.find((t) => t.id === player.teamId);
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="group bg-white border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all p-5 flex items-center gap-4"
              >
                <div
                  className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-primary text-white border-2 border-black font-display text-xl"
                  style={{ backgroundColor: team?.primaryColor ?? "#FF5722" }}
                >
                  {player.number ?? "#"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display uppercase text-lg leading-none">
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    {player.position ?? "—"} · {team?.abbreviation ?? "FA"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1 flex-shrink-0" />
              </Link>
            );
          })}

          {(!filtered || filtered.length === 0) && !isLoading && (
            <div className="col-span-full bg-gray-50 border-4 border-dashed border-gray-300 p-12 text-center text-muted-foreground font-display text-xl uppercase">
              No players found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
