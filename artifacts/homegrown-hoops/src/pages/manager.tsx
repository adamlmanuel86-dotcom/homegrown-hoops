import { useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetManagerMyTeams,
  useCreateManagerTeam,
  useListManagerDelegations,
  useCreateManagerDelegation,
  useDeleteManagerDelegation,
  useListProfiles,
  useGetMyProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Users, Trash2, ArrowRight, ClipboardList, X } from "lucide-react";

export function ManagerPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: myProfile } = useGetMyProfile({ query: { enabled: isSignedIn === true, retry: false } });
  const { data: myTeams, refetch: refetchTeams } = useGetManagerMyTeams({ query: { enabled: isSignedIn === true } });
  const { data: delegations, refetch: refetchDelegations } = useListManagerDelegations({ query: { enabled: isSignedIn === true } });
  const { data: allProfiles } = useListProfiles({ query: { enabled: isSignedIn === true } });

  const createTeam = useCreateManagerTeam();
  const createDelegation = useCreateManagerDelegation();
  const deleteDelegation = useDeleteManagerDelegation();

  const [newTeamForm, setNewTeamForm] = useState({ name: "", city: "", league: "" });
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [newTeamError, setNewTeamError] = useState("");

  const [delegateSearch, setDelegateSearch] = useState("");
  const [delegateTeamId, setDelegateTeamId] = useState<number | "">("");
  const [delegateUserId, setDelegateUserId] = useState("");
  const [delegateError, setDelegateError] = useState("");
  const [showDelegateForm, setShowDelegateForm] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn || !myProfile || !["admin", "manager"].includes(myProfile.role) || myProfile.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="font-bold text-lg">Manager Access Required</p>
          <p className="text-muted-foreground text-sm">You need a manager account to access this page.</p>
          <button onClick={() => setLocation("/")} className="btn-primary">← Back to League</button>
        </div>
      </div>
    );
  }

  const managerTeamIds = (myProfile.teamIds as number[] | null) ?? [];
  const filteredProfiles = delegateSearch.trim().length >= 2
    ? (allProfiles ?? []).filter((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(delegateSearch.toLowerCase()) &&
        p.clerkUserId !== myProfile.clerkUserId
      )
    : [];

  async function handleCreateTeam() {
    setNewTeamError("");
    if (!newTeamForm.name.trim()) { setNewTeamError("Team name is required"); return; }
    try {
      await createTeam.mutateAsync({ data: { name: newTeamForm.name, city: newTeamForm.city || null, league: newTeamForm.league || null } });
      await qc.invalidateQueries({ queryKey: ["/api/manager/my-teams"] });
      void refetchTeams();
      setNewTeamForm({ name: "", city: "", league: "" });
      setShowNewTeamForm(false);
    } catch {
      setNewTeamError("Failed to create team. Try again.");
    }
  }

  async function handleCreateDelegation() {
    setDelegateError("");
    if (!delegateUserId || !delegateTeamId) { setDelegateError("Select a user and team"); return; }
    try {
      await createDelegation.mutateAsync({ data: { delegateeClerkUserId: delegateUserId, teamId: Number(delegateTeamId) } });
      await qc.invalidateQueries({ queryKey: ["/api/manager/delegations"] });
      void refetchDelegations();
      setDelegateUserId("");
      setDelegateSearch("");
      setDelegateTeamId("");
      setShowDelegateForm(false);
    } catch {
      setDelegateError("Failed to create delegation. Try again.");
    }
  }

  async function handleDeleteDelegation(id: number) {
    await deleteDelegation.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: ["/api/manager/delegations"] });
    void refetchDelegations();
  }

  const teamLookup = Object.fromEntries((myTeams ?? []).map((t) => [t.id, t]));
  const profileLookup = Object.fromEntries((allProfiles ?? []).map((p) => [p.clerkUserId, p]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-4xl text-primary">MANAGER DASHBOARD</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your teams and grant game-tracking access.</p>
      </div>

      {/* ── MY TEAMS ── */}
      <section className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">My Teams</h2>
          <button
            onClick={() => setShowNewTeamForm((v) => !v)}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold bg-primary/10 border border-primary/30 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Team
          </button>
        </div>

        {showNewTeamForm && (
          <div className="px-6 py-4 border-b border-border bg-muted/20 space-y-3">
            <p className="text-sm font-bold text-secondary">New Team</p>
            <input
              value={newTeamForm.name}
              onChange={(e) => setNewTeamForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Team name (required)"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                value={newTeamForm.city}
                onChange={(e) => setNewTeamForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={newTeamForm.league}
                onChange={(e) => setNewTeamForm((f) => ({ ...f, league: e.target.value }))}
                placeholder="League"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {newTeamError && <p className="text-red-400 text-xs">{newTeamError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreateTeam} disabled={createTeam.isPending} className="btn-primary text-sm px-4 py-2">
                {createTeam.isPending ? "Creating…" : "Create Team"}
              </button>
              <button onClick={() => { setShowNewTeamForm(false); setNewTeamError(""); }} className="text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-border">
          {(myTeams ?? []).length === 0 && (
            <div className="px-6 py-6 text-center text-muted-foreground text-sm">
              No teams yet. Create one above.
            </div>
          )}
          {(myTeams ?? []).map((team) => (
            <div key={team.id} className="flex items-center gap-4 px-6 py-4">
              <div
                className="w-3 h-10 rounded-sm shrink-0"
                style={{ background: team.primaryColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-secondary truncate">{team.name}</p>
                <p className="text-xs text-muted-foreground">
                  {team.city || "—"}
                  {team.league ? ` · ${team.league}` : ""}
                  {" · "}
                  {team.wins}W–{team.losses}L
                </p>
              </div>
              <a
                href={`/track-game?team=${team.id}`}
                className="flex items-center gap-1.5 text-xs font-bold bg-primary/10 border border-primary/30 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors shrink-0"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Track Game
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── DELEGATIONS ── */}
      <section className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Shield className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h2 className="font-bold text-secondary">Game Tracking Delegations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Grant another user one-time access to track a game for your team.
            </p>
          </div>
          <button
            onClick={() => setShowDelegateForm((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold bg-primary/10 border border-primary/30 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Grant Access
          </button>
        </div>

        {showDelegateForm && (
          <div className="px-6 py-4 border-b border-border bg-muted/20 space-y-3">
            <p className="text-sm font-bold text-secondary">Grant Game-Tracking Access</p>

            <div className="space-y-1">
              <input
                value={delegateSearch}
                onChange={(e) => { setDelegateSearch(e.target.value); setDelegateUserId(""); }}
                placeholder="Search users by name…"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
              {filteredProfiles.length > 0 && !delegateUserId && (
                <div className="border border-border rounded-lg overflow-hidden">
                  {filteredProfiles.slice(0, 6).map((p) => (
                    <button
                      key={p.clerkUserId}
                      type="button"
                      onClick={() => { setDelegateUserId(p.clerkUserId); setDelegateSearch(`${p.firstName} ${p.lastName}`); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border last:border-b-0"
                    >
                      {p.firstName} {p.lastName}
                    </button>
                  ))}
                </div>
              )}
              {delegateUserId && (
                <div className="flex items-center gap-2 text-xs text-green-400 mt-1">
                  <span>✓ {delegateSearch}</span>
                  <button onClick={() => { setDelegateUserId(""); setDelegateSearch(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <select
              value={delegateTeamId}
              onChange={(e) => setDelegateTeamId(e.target.value ? Number(e.target.value) : "")}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select team…</option>
              {(myProfile.role === "admin" ? (myTeams ?? []) : (myTeams ?? []).filter((t) => managerTeamIds.includes(t.id))).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {delegateError && <p className="text-red-400 text-xs">{delegateError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreateDelegation}
                disabled={createDelegation.isPending || !delegateUserId || !delegateTeamId}
                className="btn-primary text-sm px-4 py-2"
              >
                {createDelegation.isPending ? "Granting…" : "Grant Access"}
              </button>
              <button onClick={() => { setShowDelegateForm(false); setDelegateError(""); setDelegateUserId(""); setDelegateSearch(""); setDelegateTeamId(""); }} className="text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-border">
          {(delegations ?? []).length === 0 && (
            <div className="px-6 py-6 text-center text-muted-foreground text-sm">
              No active delegations.
            </div>
          )}
          {(delegations ?? []).map((d) => {
            const delegatee = profileLookup[d.delegateeClerkUserId];
            const team = teamLookup[d.teamId];
            return (
              <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-secondary text-sm">
                    {delegatee ? `${delegatee.firstName} ${delegatee.lastName}` : d.delegateeClerkUserId}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Team: {team?.name ?? `#${d.teamId}`}
                    {" · "}
                    Granted {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteDelegation(d.id)}
                  disabled={deleteDelegation.isPending}
                  className="flex items-center gap-1.5 text-xs font-bold bg-red-600/10 border border-red-600/30 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-600/20 transition-colors shrink-0"
                  title="Revoke delegation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex gap-3">
        <a href="/track-game" className="btn-primary flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Track a Game
        </a>
        <button onClick={() => setLocation("/")} className="btn-secondary flex items-center gap-2">
          ← League Home
        </button>
      </div>
    </div>
  );
}
