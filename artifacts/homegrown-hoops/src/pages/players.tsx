import { useState } from "react";
import { useListProfiles } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, ArrowRight, Search, GraduationCap } from "lucide-react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

export function PlayersPage() {
  const [search, setSearch] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const { data: profiles, isLoading } = useListProfiles();

  const filtered = profiles?.filter((p) => {
    const nameMatch = `${p.firstName} ${p.lastName}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const posMatch = !selectedPosition || p.position === selectedPosition;
    return nameMatch && posMatch;
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="label-upper mb-1">The Roster</p>
        <h1 className="font-display text-4xl md:text-5xl text-secondary">ALL PLAYERS</h1>
        <p className="text-muted-foreground mt-2">Every baller in the league</p>
      </div>

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
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          className="border border-border rounded-lg px-4 py-2.5 text-sm font-semibold bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">All Positions</option>
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
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
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((profile) => {
            const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();
            return (
              <Link
                key={profile.id}
                href={`/profiles/${profile.clerkUserId}`}
                className="card-base p-4 flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-lg text-white flex-shrink-0 bg-primary/80">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-secondary text-sm leading-tight">
                    {profile.number != null && (
                      <span className="text-primary font-black mr-1.5">#{profile.number}</span>
                    )}
                    {profile.firstName} {profile.lastName}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-bold text-primary">
                      {profile.position ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {profile.school ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <GraduationCap className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {profile.graduationYear ? `Class of ${profile.graduationYear}` : "—"}
                    </span>
                  </div>
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
            {search || selectedPosition
              ? "Try a different search or filter."
              : "Players will appear here once they've created a profile."}
          </p>
        </div>
      )}
    </div>
  );
}
