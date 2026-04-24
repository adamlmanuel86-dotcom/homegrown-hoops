import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetMyProfile,
  useListAdminUsers,
  useListProfiles,
  useUpdateUserRole,
  useUpdateProfile,
  useDeleteProfile,
  useListTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useListGames,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Shield, User, Lock, Pencil, Save, X, Users, Trash2, AlertTriangle, Plus, CheckCircle, UserCheck, CalendarDays, Waves, ChevronDown, ChevronUp, Trophy, RotateCcw } from "lucide-react";
import { TIDES } from "@/components/recognition";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const ROLES = ["admin", "coach", "player"] as const;
type Role = typeof ROLES[number];

const roleBadge: Record<Role, string> = {
  admin: "bg-primary/10 text-primary font-bold",
  coach: "bg-blue-900/40 text-blue-300 font-semibold",
  player: "bg-muted text-muted-foreground font-medium",
};

const roleLabel: Record<Role, string> = {
  admin: "Admin",
  coach: "Coach",
  player: "Player",
};

interface TeamEditState {
  name: string;
  city: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
}

export function AdminPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: myProfile, isLoading: profileLoading } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });

  const isAdmin = myProfile?.role === "admin";

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation("/sign-in");
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    if (!profileLoading && myProfile && !isAdmin) setLocation("/");
  }, [profileLoading, myProfile, isAdmin, setLocation]);

  const { data: users, isLoading: usersLoading } = useListAdminUsers({
    query: { enabled: isAdmin === true },
  });
  const { data: teams, isLoading: teamsLoading } = useListTeams({
    query: { enabled: isAdmin === true },
  });
  const { data: profiles, isLoading: profilesLoading } = useListProfiles({
    query: { enabled: isAdmin === true },
  });

  const { data: games, isLoading: gamesLoading } = useListGames({
    query: { enabled: isAdmin === true },
  });

  const updateRole = useUpdateUserRole();
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const deleteGame = useMutation({
    mutationFn: async (gameId: number) => {
      const res = await fetch(`${BASE_URL}/api/games/${gameId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete game");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/games"] }),
  });

  // Run the canonical roster sync + load tide profiles once when admin is confirmed.
  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${BASE_URL}/api/admin/sync-all-players`, { method: "POST" })
      .then(() => qc.invalidateQueries({ queryKey: ["/api/players"] }))
      .catch(() => { /* non-critical, silent */ });
    loadTideProfiles();
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tidesSeasonInput, setTidesSeasonInput] = useState("");
  const [tidesSeasonMsg, setTidesSeasonMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [expandedTidePlayerId, setExpandedTidePlayerId] = useState<number | null>(null);
  const [tideProfiles, setTideProfiles] = useState<{ id: number; firstName: string; lastName: string; tides: { id: string; earnedAt: string }[] }[]>([]);
  const [tideProfilesLoading, setTideProfilesLoading] = useState(false);
  const [tideProfilesLoaded, setTideProfilesLoaded] = useState(false);

  async function loadTideProfiles() {
    setTideProfilesLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/profiles-tides`);
      if (res.ok) {
        const data = await res.json();
        setTideProfiles(data.map((p: { id: number; firstName: string; lastName: string; tides: { id: string; earnedAt: string }[] | null }) => ({
          ...p,
          tides: p.tides ?? [],
        })));
        setTideProfilesLoaded(true);
      }
    } finally {
      setTideProfilesLoading(false);
    }
  }

  const calculateSeasonTides = useMutation({
    mutationFn: async (season: string) => {
      const res = await fetch(`${BASE_URL}/api/admin/season-tides/${encodeURIComponent(season)}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to calculate tides");
      }
      return res.json();
    },
    onSuccess: () => {
      setTidesSeasonMsg({ ok: true, text: "Season tides calculated and awarded successfully." });
      loadTideProfiles();
      qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
    onError: (err: Error) => {
      setTidesSeasonMsg({ ok: false, text: err.message });
    },
  });

  const awardTide = useMutation({
    mutationFn: async ({ profileId, tideId }: { profileId: number; tideId: string }) => {
      const res = await fetch(`${BASE_URL}/api/admin/profiles/${profileId}/tides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tideId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to award tide");
      }
      return res.json();
    },
    onSuccess: () => {
      loadTideProfiles();
      qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
  });

  const removeTide = useMutation({
    mutationFn: async ({ profileId, tideId }: { profileId: number; tideId: string }) => {
      const res = await fetch(`${BASE_URL}/api/admin/profiles/${profileId}/tides/${encodeURIComponent(tideId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to remove tide");
      }
      return res.json();
    },
    onSuccess: () => {
      loadTideProfiles();
      qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
  });

  const [confirmingDeleteGameId, setConfirmingDeleteGameId] = useState<number | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [teamEdit, setTeamEdit] = useState<TeamEditState>({ name: "", city: "", abbreviation: "", primaryColor: "#FF6B00", secondaryColor: "#132237" });
  const [teamSaveError, setTeamSaveError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  type TideWinner = { tideId: string; tideLabel: string; playerName: string };
  const [endOfSeasonTeamId, setEndOfSeasonTeamId] = useState<number | null>(null);
  const [endOfSeasonPending, setEndOfSeasonPending] = useState(false);
  const [endOfSeasonResults, setEndOfSeasonResults] = useState<{ season: string; winners: TideWinner[] } | null>(null);
  const [endOfSeasonError, setEndOfSeasonError] = useState<string | null>(null);

  const [newSeasonResetTeamId, setNewSeasonResetTeamId] = useState<number | null>(null);
  const [newSeasonResetPending, setNewSeasonResetPending] = useState(false);
  const [newSeasonResetDone, setNewSeasonResetDone] = useState(false);
  const [newSeasonResetError, setNewSeasonResetError] = useState<string | null>(null);

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeam, setNewTeam] = useState<TeamEditState>({ name: "", city: "", abbreviation: "", primaryColor: "#FF6B00", secondaryColor: "#132237" });
  const [addTeamError, setAddTeamError] = useState<string | null>(null);

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileEdit, setProfileEdit] = useState<{ teamId: string; verified: boolean }>({ teamId: "", verified: false });
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [confirmingDeleteProfileId, setConfirmingDeleteProfileId] = useState<string | null>(null);

  function startEditProfile(clerkUserId: string, currentTeamId: number | null | undefined, currentVerified: boolean) {
    setEditingProfileId(clerkUserId);
    setProfileEdit({ teamId: currentTeamId?.toString() ?? "", verified: currentVerified });
    setProfileSaveError(null);
  }

  function cancelEditProfile() {
    setEditingProfileId(null);
    setProfileSaveError(null);
  }

  async function handleProfileDelete(clerkUserId: string) {
    await deleteProfile.mutateAsync({ clerkUserId });
    await qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    setConfirmingDeleteProfileId(null);
  }

  async function handleProfileSave(clerkUserId: string) {
    try {
      await updateProfile.mutateAsync({
        clerkUserId,
        data: {
          teamId: profileEdit.teamId ? parseInt(profileEdit.teamId) : null,
          verified: profileEdit.verified,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/profiles"] }),
        qc.invalidateQueries({ queryKey: ["/api/players"] }),
      ]);
      setEditingProfileId(null);
      setProfileSaveError(null);
    } catch {
      setProfileSaveError("Failed to save. Please try again.");
    }
  }

  async function handleRoleChange(clerkUserId: string, newRole: Role) {
    await updateRole.mutateAsync({ clerkUserId, data: { role: newRole } });
    await qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
  }

  async function handleCreateTeam() {
    if (!newTeam.name.trim() || !newTeam.city.trim() || !newTeam.abbreviation.trim()) {
      setAddTeamError("Name, city, and abbreviation are required.");
      return;
    }
    try {
      await createTeam.mutateAsync({
        data: {
          name: newTeam.name.trim(),
          city: newTeam.city.trim(),
          abbreviation: newTeam.abbreviation.trim().toUpperCase().slice(0, 4),
          primaryColor: newTeam.primaryColor,
          secondaryColor: newTeam.secondaryColor,
        },
      });
      await qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setShowAddTeam(false);
      setNewTeam({ name: "", city: "", abbreviation: "", primaryColor: "#FF6B00", secondaryColor: "#132237" });
      setAddTeamError(null);
    } catch {
      setAddTeamError("Failed to create team. Please try again.");
    }
  }

  function startEditTeam(team: NonNullable<typeof teams>[number]) {
    setEditingTeamId(team.id);
    setTeamEdit({
      name: team.name,
      city: team.city,
      abbreviation: team.abbreviation,
      primaryColor: team.primaryColor ?? "#FF6B00",
      secondaryColor: team.secondaryColor ?? "#132237",
    });
    setTeamSaveError(null);
  }

  function cancelEditTeam() {
    setEditingTeamId(null);
    setTeamSaveError(null);
  }

  async function handleTeamDelete(teamId: number) {
    await deleteTeam.mutateAsync({ id: teamId });
    await qc.invalidateQueries({ queryKey: ["/api/teams"] });
    setConfirmingDeleteId(null);
  }

  async function runEndOfSeason(teamId: number) {
    setEndOfSeasonPending(true);
    setEndOfSeasonError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/teams/${teamId}/season-tides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json() as { season: string; winners: TideWinner[] };
      setEndOfSeasonResults({ season: data.season, winners: data.winners });
      loadTideProfiles();
      await qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    } catch (e: unknown) {
      setEndOfSeasonError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setEndOfSeasonPending(false);
    }
  }

  async function runNewSeasonReset(teamId: number) {
    setNewSeasonResetPending(true);
    setNewSeasonResetError(null);
    setNewSeasonResetDone(false);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/teams/${teamId}/new-season-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setNewSeasonResetDone(true);
      loadTideProfiles();
      await qc.invalidateQueries({ queryKey: ["/api/profiles"] });
      await qc.invalidateQueries({ queryKey: ["/api/games"] });
    } catch (e: unknown) {
      setNewSeasonResetError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setNewSeasonResetPending(false);
    }
  }

  async function handleTeamSave(teamId: number) {
    if (!teamEdit.name.trim() || !teamEdit.city.trim() || !teamEdit.abbreviation.trim()) {
      setTeamSaveError("Name, city, and abbreviation are required.");
      return;
    }
    try {
      await updateTeam.mutateAsync({
        id: teamId,
        data: {
          name: teamEdit.name.trim(),
          city: teamEdit.city.trim(),
          abbreviation: teamEdit.abbreviation.trim().toUpperCase().slice(0, 4),
          primaryColor: teamEdit.primaryColor,
          secondaryColor: teamEdit.secondaryColor,
        },
      });
      await qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingTeamId(null);
      setTeamSaveError(null);
    } catch {
      setTeamSaveError("Failed to save changes.");
    }
  }

  if (!isLoaded || profileLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-8">
      <div>
        <p className="label-upper mb-1">Management</p>
        <h1 className="font-display text-4xl md:text-5xl text-secondary">ADMIN PANEL</h1>
        <p className="text-muted-foreground mt-2">Manage teams, users, and league settings.</p>
      </div>

      {/* Game Management */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Games</h2>
          {games && (
            <span className="text-sm text-muted-foreground ml-1">
              {games.length} {games.length === 1 ? "game" : "games"}
            </span>
          )}
        </div>

        {gamesLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-48" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
                <div className="h-8 bg-muted rounded-lg w-20" />
              </div>
            ))}
          </div>
        ) : games?.length ? (
          <div className="divide-y divide-border">
            {games.map((g) => {
              const homeTeam = teams?.find((t) => t.id === g.homeTeamId);
              const awayTeam = teams?.find((t) => t.id === g.awayTeamId);
              const isConfirming = confirmingDeleteGameId === g.id;
              return (
                <div key={g.id} className="px-6 py-4">
                  {isConfirming ? (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Delete <span className="text-red-400">{awayTeam?.name ?? "Away"} vs {homeTeam?.name ?? "Home"}</span>?
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Are you sure you want to delete this game? This cannot be undone. All stats and videos will be removed.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={async () => {
                              await deleteGame.mutateAsync(g.id);
                              setConfirmingDeleteGameId(null);
                            }}
                            disabled={deleteGame.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 active:scale-95 text-white transition-all touch-manipulation disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deleteGame.isPending ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteGameId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted active:scale-95 transition-all touch-manipulation"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-secondary text-sm">
                          {awayTeam?.name ?? "Away"} vs {homeTeam?.name ?? "Home"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {g.gameDate} · {g.season}
                          {g.homeScore != null && g.awayScore != null && (
                            <span className="ml-2 font-bold text-primary">{g.awayScore}–{g.homeScore}</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => setConfirmingDeleteGameId(g.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 active:scale-95 transition-all touch-manipulation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            No games scheduled yet.
          </div>
        )}
      </div>

      {/* Team Management */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Teams</h2>
          {teams && (
            <span className="text-sm text-muted-foreground">
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
          )}
          <button
            onClick={() => { setShowAddTeam((v) => !v); setAddTeamError(null); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Team
          </button>
        </div>

        {/* Add Team form */}
        {showAddTeam && (
          <div className="px-6 py-5 border-b border-border bg-primary/5">
            <p className="label-upper text-primary mb-4">New Team</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-upper block mb-1.5">Team Name</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Harbour View"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="label-upper block mb-1.5">City</label>
                <input
                  type="text"
                  value={newTeam.city}
                  onChange={(e) => setNewTeam((s) => ({ ...s, city: e.target.value }))}
                  placeholder="e.g. Saint John"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="label-upper block mb-1.5">Abbreviation (max 4)</label>
                <input
                  type="text"
                  value={newTeam.abbreviation}
                  onChange={(e) => setNewTeam((s) => ({ ...s, abbreviation: e.target.value.toUpperCase().slice(0, 4) }))}
                  placeholder="e.g. HV"
                  maxLength={4}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="label-upper block mb-1.5">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newTeam.primaryColor}
                    onChange={(e) => setNewTeam((s) => ({ ...s, primaryColor: e.target.value }))}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-sm font-mono text-muted-foreground">{newTeam.primaryColor.toUpperCase()}</span>
                </div>
              </div>
              <div>
                <label className="label-upper block mb-1.5">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newTeam.secondaryColor}
                    onChange={(e) => setNewTeam((s) => ({ ...s, secondaryColor: e.target.value }))}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-sm font-mono text-muted-foreground">{newTeam.secondaryColor.toUpperCase()}</span>
                </div>
              </div>
            </div>
            {addTeamError && <p className="text-red-500 text-sm font-medium mt-3">{addTeamError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreateTeam}
                disabled={createTeam.isPending}
                className="btn-primary text-sm py-2"
              >
                <Save className="h-3.5 w-3.5" />
                {createTeam.isPending ? "Creating…" : "Create Team"}
              </button>
              <button
                onClick={() => { setShowAddTeam(false); setAddTeamError(null); }}
                className="px-3 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {teamsLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-36" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : teams?.length ? (
          <div className="divide-y divide-border">
            {teams.map((team) => {
              const isEditing = editingTeamId === team.id;
              const isConfirming = confirmingDeleteId === team.id;
              return (
                <div key={team.id} className="px-6 py-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input value={teamEdit.name} onChange={(e) => setTeamEdit((s) => ({ ...s, name: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm" />
                        <input value={teamEdit.city} onChange={(e) => setTeamEdit((s) => ({ ...s, city: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm" />
                        <input value={teamEdit.abbreviation} onChange={(e) => setTeamEdit((s) => ({ ...s, abbreviation: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm" />
                        <input value={teamEdit.primaryColor} onChange={(e) => setTeamEdit((s) => ({ ...s, primaryColor: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm" />
                        <input value={teamEdit.secondaryColor} onChange={(e) => setTeamEdit((s) => ({ ...s, secondaryColor: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm" />
                      </div>
                      {teamSaveError && <p className="text-red-500 text-sm font-medium">{teamSaveError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleTeamSave(team.id)} className="btn-primary text-sm py-2"><Save className="h-3.5 w-3.5" />Save</button>
                        <button onClick={cancelEditTeam} className="px-3 py-2 text-sm font-semibold rounded-lg border border-border">Cancel</button>
                      </div>
                    </div>
                  ) : isConfirming ? (
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">Delete {team.name}?</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleTeamDelete(team.id)} className="btn-primary text-sm py-2">Yes, delete</button>
                          <button onClick={() => setConfirmingDeleteId(null)} className="px-3 py-2 text-sm font-semibold rounded-lg border border-border">Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Team info row */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: team.primaryColor ?? "#FF6B00" }}>
                          {team.abbreviation}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-secondary">{team.name}</p>
                          <p className="text-xs text-muted-foreground">{team.city} · {team.abbreviation}</p>
                        </div>
                        <button onClick={() => startEditTeam(team)} className="px-3 py-2 text-xs font-semibold rounded-lg border border-border">Edit</button>
                        <button onClick={() => setConfirmingDeleteId(team.id)} className="px-3 py-2 text-xs font-semibold rounded-lg border border-red-500/30 text-red-400">Delete</button>
                      </div>

                      {/* Season action buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                        <button
                          onClick={() => {
                            const opening = endOfSeasonTeamId !== team.id;
                            setEndOfSeasonTeamId(opening ? team.id : null);
                            if (opening) { setEndOfSeasonResults(null); setEndOfSeasonError(null); }
                            setNewSeasonResetTeamId(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          <Trophy className="h-3.5 w-3.5" />
                          End of Season
                        </button>
                        <button
                          onClick={() => {
                            const opening = newSeasonResetTeamId !== team.id;
                            setNewSeasonResetTeamId(opening ? team.id : null);
                            if (opening) { setNewSeasonResetDone(false); setNewSeasonResetError(null); }
                            setEndOfSeasonTeamId(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          New Season Reset
                        </button>
                      </div>

                      {/* End of Season drawer */}
                      {endOfSeasonTeamId === team.id && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                          {endOfSeasonResults ? (
                            <>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                <p className="text-sm font-bold text-amber-300">Tides awarded for {endOfSeasonResults.season}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {endOfSeasonResults.winners.map((w) => (
                                  <div key={w.tideId} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <span className="text-xs font-bold text-amber-300">{w.tideLabel}</span>
                                    <span className="text-xs text-muted-foreground font-medium">{w.playerName}</span>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => { setEndOfSeasonTeamId(null); setEndOfSeasonResults(null); }}
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Close
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-bold text-amber-300 mb-1">End of Season — {team.name}</p>
                                  <p className="text-xs text-muted-foreground">This will calculate and award all Tides for this team based on current season stats. This cannot be undone. Are you sure?</p>
                                </div>
                              </div>
                              {endOfSeasonError && <p className="text-xs text-red-400 font-medium">{endOfSeasonError}</p>}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => runEndOfSeason(team.id)}
                                  disabled={endOfSeasonPending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
                                >
                                  <Trophy className="h-3.5 w-3.5" />
                                  {endOfSeasonPending ? "Calculating…" : "Yes, Award Tides"}
                                </button>
                                <button
                                  onClick={() => { setEndOfSeasonTeamId(null); setEndOfSeasonError(null); }}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* New Season Reset drawer */}
                      {newSeasonResetTeamId === team.id && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                          {newSeasonResetDone ? (
                            <>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                                <p className="text-sm font-bold text-green-300">Season archived. All data preserved. Ready for a fresh season.</p>
                              </div>
                              <button
                                onClick={() => { setNewSeasonResetTeamId(null); setNewSeasonResetDone(false); }}
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Close
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-bold text-red-300 mb-1">New Season Reset — {team.name}</p>
                                  <p className="text-xs text-muted-foreground">This will archive the current season and start a fresh new season. All historical data is preserved and viewable. This cannot be undone.</p>
                                </div>
                              </div>
                              {newSeasonResetError && <p className="text-xs text-red-400 font-medium">{newSeasonResetError}</p>}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => runNewSeasonReset(team.id)}
                                  disabled={newSeasonResetPending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  {newSeasonResetPending ? "Archiving…" : "Yes, Archive Season"}
                                </button>
                                <button
                                  onClick={() => { setNewSeasonResetTeamId(null); setNewSeasonResetError(null); }}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">No teams yet.</div>
        )}
      </div>

      {/* User Management */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <UserCheck className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Users</h2>
          {users && <span className="text-sm text-muted-foreground">{users.length} users</span>}
        </div>

        {usersLoading ? (
          <div className="divide-y divide-border">Loading…</div>
        ) : users?.length ? (
          <div>
            {users.map((u) => {
              const profile = profiles?.find((p) => p.clerkUserId === u.clerkUserId);
              const isEditing = editingProfileId === u.clerkUserId;
              const isConfirming = confirmingDeleteProfileId === u.clerkUserId;
              const team = teams?.find((t) => t.id === profile?.teamId);
              const profileNumericId = profile?.id;
              const tideProfile = profileNumericId
                ? tideProfiles.find((tp) => tp.id === profileNumericId)
                : undefined;
              const earnedTideIds = new Set(
                (tideProfile?.tides ?? profile?.tides ?? []).map((t: { id: string }) => t.id)
              );
              const isTidesExpanded = expandedTidePlayerId === profileNumericId;

              return (
                <div key={u.clerkUserId} className="border-b border-border last:border-0">
                  <div className="px-6 py-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select value={profileEdit.teamId} onChange={(e) => setProfileEdit((s) => ({ ...s, teamId: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm">
                            <option value="">No team / unaffiliated</option>
                            {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleProfileSave(u.clerkUserId)} className="btn-primary text-sm py-2"><Save className="h-3.5 w-3.5" />Save</button>
                          <button onClick={cancelEditProfile} className="px-3 py-2 text-sm font-semibold rounded-lg border border-border">Cancel</button>
                        </div>
                      </div>
                    ) : isConfirming ? (
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">Delete {u.firstName} {u.lastName}?</p>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleProfileDelete(u.clerkUserId)} className="btn-primary text-sm py-2">Yes, delete</button>
                            <button onClick={() => setConfirmingDeleteProfileId(null)} className="px-3 py-2 text-sm font-semibold rounded-lg border border-border">Cancel</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-secondary">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">{team?.name ?? "No team / unaffiliated"}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                if (!profileNumericId) return;
                                setExpandedTidePlayerId(isTidesExpanded ? null : profileNumericId);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all touch-manipulation ${
                                isTidesExpanded
                                  ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                                  : "border-border hover:border-blue-500/30 hover:bg-blue-500/5 text-muted-foreground hover:text-blue-300"
                              }`}
                            >
                              <Waves className="h-3.5 w-3.5" />
                              Tides {earnedTideIds.size}/8
                              {isTidesExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <button onClick={() => startEditProfile(u.clerkUserId, profile?.teamId, profile?.verified ?? false)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors touch-manipulation">Edit</button>
                            <button onClick={() => setConfirmingDeleteProfileId(u.clerkUserId)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors touch-manipulation">Delete</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Admin Override Tides Drawer ── */}
                  {isTidesExpanded && !isEditing && !isConfirming && (
                    <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-blue-500/20 bg-blue-950/20">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20">
                        <Shield className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Admin Override — Tides</span>
                        <span className="text-xs text-blue-400/60 ml-1">· For exceptional circumstances only</span>
                      </div>
                      <div className="p-4">
                        {tideProfilesLoading ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {TIDES.map((tide) => {
                              const isAwarded = earnedTideIds.has(tide.id);
                              const TideIcon = tide.icon;
                              const isPending =
                                (awardTide.isPending && (awardTide.variables as { profileId: number; tideId: string } | undefined)?.tideId === tide.id && (awardTide.variables as { profileId: number; tideId: string } | undefined)?.profileId === profileNumericId) ||
                                (removeTide.isPending && (removeTide.variables as { profileId: number; tideId: string } | undefined)?.tideId === tide.id && (removeTide.variables as { profileId: number; tideId: string } | undefined)?.profileId === profileNumericId);
                              return (
                                <button
                                  key={tide.id}
                                  onClick={() => {
                                    if (!profileNumericId || isPending) return;
                                    if (isAwarded) {
                                      removeTide.mutate({ profileId: profileNumericId, tideId: tide.id });
                                    } else {
                                      awardTide.mutate({ profileId: profileNumericId, tideId: tide.id });
                                    }
                                  }}
                                  disabled={isPending}
                                  title={tide.description}
                                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all touch-manipulation disabled:opacity-50 ${
                                    isAwarded
                                      ? "bg-opacity-20 border-opacity-40"
                                      : "border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/15"
                                  }`}
                                  style={isAwarded ? {
                                    background: `${tide.color}18`,
                                    borderColor: `${tide.color}44`,
                                  } : {}}
                                >
                                  <TideIcon
                                    className="h-4 w-4"
                                    style={{ color: isAwarded ? tide.color : "hsl(215 16% 45%)" }}
                                  />
                                  <span
                                    className="text-xs font-bold leading-tight"
                                    style={{ color: isAwarded ? tide.color : "hsl(215 16% 55%)" }}
                                  >
                                    {tide.label}
                                  </span>
                                  <span
                                    className="text-xs leading-none"
                                    style={{ color: isAwarded ? `${tide.color}bb` : "hsl(215 16% 40%)" }}
                                  >
                                    {isPending ? "…" : isAwarded ? "✓ On" : "Off"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
