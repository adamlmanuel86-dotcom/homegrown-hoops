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
import { Shield, User, Lock, Pencil, Save, X, Users, Trash2, AlertTriangle, Plus, CheckCircle, UserCheck, CalendarDays, Waves, ChevronDown, ChevronUp } from "lucide-react";
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

  // ── Tide management state ──
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
      await qc.invalidateQueries({ queryKey: ["/api/profiles"] });
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
                <div className="h-8 bg-muted rounded-lg w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {teams?.map((team) => {
              const isEditing = editingTeamId === team.id;
              return (
                <div key={team.id} className="px-6 py-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label-upper block mb-1.5">Team Name</label>
                          <input
                            type="text"
                            value={teamEdit.name}
                            onChange={(e) => setTeamEdit((s) => ({ ...s, name: e.target.value }))}
                            placeholder="e.g. Harbour View"
                            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                        <div>
                          <label className="label-upper block mb-1.5">City</label>
                          <input
                            type="text"
                            value={teamEdit.city}
                            onChange={(e) => setTeamEdit((s) => ({ ...s, city: e.target.value }))}
                            placeholder="e.g. Saint John"
                            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                        <div>
                          <label className="label-upper block mb-1.5">Abbreviation (max 4)</label>
                          <input
                            type="text"
                            value={teamEdit.abbreviation}
                            onChange={(e) => setTeamEdit((s) => ({ ...s, abbreviation: e.target.value.toUpperCase().slice(0, 4) }))}
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
                              value={teamEdit.primaryColor}
                              onChange={(e) => setTeamEdit((s) => ({ ...s, primaryColor: e.target.value }))}
                              className="h-10 w-14 rounded-lg border border-border cursor-pointer p-0.5 bg-white"
                            />
                            <span className="text-sm font-mono text-muted-foreground">{teamEdit.primaryColor.toUpperCase()}</span>
                          </div>
                        </div>
                        <div>
                          <label className="label-upper block mb-1.5">Secondary Color</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={teamEdit.secondaryColor}
                              onChange={(e) => setTeamEdit((s) => ({ ...s, secondaryColor: e.target.value }))}
                              className="h-10 w-14 rounded-lg border border-border cursor-pointer p-0.5 bg-white"
                            />
                            <span className="text-sm font-mono text-muted-foreground">{teamEdit.secondaryColor.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      {teamSaveError && <p className="text-red-600 text-sm font-medium">{teamSaveError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTeamSave(team.id)}
                          disabled={updateTeam.isPending}
                          className="btn-primary text-sm py-2"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {updateTeam.isPending ? "Saving…" : "Save Changes"}
                        </button>
                        <button
                          onClick={cancelEditTeam}
                          className="px-3 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : confirmingDeleteId === team.id ? (
                    /* ── Inline delete confirmation ── */
                    <div className="flex items-start gap-3 py-1">
                      <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Delete <span className="text-red-400">{team.name}</span>?
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          This will permanently remove the team and all associated games and stats.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleTeamDelete(team.id)}
                            disabled={deleteTeam.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deleteTeam.isPending ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal team row ── */
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-sm text-white flex-shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${team.secondaryColor ?? "#132237"}, ${team.primaryColor ?? "#FF6B00"})` }}
                      >
                        {team.abbreviation}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-secondary truncate">{team.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{team.city}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex gap-1">
                          <div
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: team.primaryColor ?? "#FF6B00" }}
                            title={`Primary: ${team.primaryColor}`}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: team.secondaryColor ?? "#132237" }}
                            title={`Secondary: ${team.secondaryColor}`}
                          />
                        </div>
                        <button
                          onClick={() => startEditTeam(team)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors text-secondary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => { setEditingTeamId(null); setConfirmingDeleteId(team.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registered Players */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <UserCheck className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Registered Players</h2>
          {profiles && (
            <span className="text-sm text-muted-foreground">
              {profiles.length} {profiles.length === 1 ? "profile" : "profiles"}
            </span>
          )}
        </div>

        {profilesLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-40" />
                  <div className="h-3 bg-muted rounded w-28" />
                </div>
                <div className="h-8 bg-muted rounded-lg w-20" />
              </div>
            ))}
          </div>
        ) : profiles?.length ? (
          <div className="divide-y divide-border">
            {profiles.map((p) => {
              const team = teams?.find((t) => t.id === p.teamId);
              const initials = `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
              const isEditing = editingProfileId === p.clerkUserId;

              return (
                <div key={p.clerkUserId} className="px-6 py-4">
                  {isEditing ? (
                    /* ── Edit form ── */
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-secondary">
                        {p.firstName} {p.lastName}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label-upper block mb-1.5">Assign Team</label>
                          <select
                            value={profileEdit.teamId}
                            onChange={(e) => setProfileEdit((s) => ({ ...s, teamId: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
                          >
                            <option value="">No team</option>
                            {teams?.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} — {t.city}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <div
                              onClick={() => setProfileEdit((s) => ({ ...s, verified: !s.verified }))}
                              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                                profileEdit.verified ? "bg-primary" : "bg-muted-foreground/30"
                              }`}
                            >
                              <div
                                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                  profileEdit.verified ? "translate-x-5" : ""
                                }`}
                              />
                            </div>
                            <span className="text-sm font-semibold text-secondary">
                              {profileEdit.verified ? "Verified player" : "Not verified"}
                            </span>
                          </label>
                        </div>
                      </div>
                      {profileSaveError && (
                        <p className="text-red-500 text-sm font-medium">{profileSaveError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleProfileSave(p.clerkUserId)}
                          disabled={updateProfile.isPending}
                          className="btn-primary text-sm py-2"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {updateProfile.isPending ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEditProfile}
                          className="px-3 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : confirmingDeleteProfileId === p.clerkUserId ? (
                    /* ── Delete confirmation ── */
                    <div className="flex items-start gap-3 py-1">
                      <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Delete <span className="text-red-400">{p.firstName} {p.lastName}</span>?
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Are you sure you want to delete this profile? This cannot be undone.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleProfileDelete(p.clerkUserId)}
                            disabled={deleteProfile.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deleteProfile.isPending ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteProfileId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-sm text-white flex-shrink-0 bg-primary/80">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-secondary text-sm">{p.firstName} {p.lastName}</p>
                          {p.verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-1.5 py-0.5 rounded-full">
                              <CheckCircle className="h-2.5 w-2.5" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {p.position && (
                            <span className="text-xs font-bold text-primary">{p.position}</span>
                          )}
                          {p.school && (
                            <span className="text-xs text-muted-foreground truncate">{p.school}</span>
                          )}
                          {team ? (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: team.primaryColor ?? "#F97316" }}
                            >
                              {team.name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-muted-foreground/60 italic">
                              No team
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEditProfile(p.clerkUserId, p.teamId, p.verified ?? false)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors text-secondary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => { cancelEditProfile(); setConfirmingDeleteProfileId(p.clerkUserId); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            No player profiles registered yet.
          </div>
        )}
      </div>

      {/* Tides Management */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Waves className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Tides</h2>
          <span className="text-sm text-muted-foreground">Season-end awards · admin override only</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Season-end automatic calculation */}
          <div>
            <p className="font-semibold text-secondary text-sm mb-1">Award Season Tides</p>
            <p className="text-xs text-muted-foreground mb-3">
              Run this at the end of the season. Calculates and awards all Tides (High Tide, The Keeper, The Source, etc.) automatically based on final cumulative season stats.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Season e.g. 2025-26"
                value={tidesSeasonInput}
                onChange={(e) => { setTidesSeasonInput(e.target.value); setTidesSeasonMsg(null); }}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button
                disabled={!tidesSeasonInput.trim() || calculateSeasonTides.isPending}
                onClick={() => calculateSeasonTides.mutate(tidesSeasonInput.trim())}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                {calculateSeasonTides.isPending ? "Calculating…" : "Calculate & Award"}
              </button>
            </div>
            {tidesSeasonMsg && (
              <p className={`text-xs mt-2 font-medium ${tidesSeasonMsg.ok ? "text-green-400" : "text-red-400"}`}>
                {tidesSeasonMsg.text}
              </p>
            )}
          </div>

          {/* Per-player manual override */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-secondary text-sm">Manual Override</p>
                <p className="text-xs text-muted-foreground">Award or remove a specific Tide from any player for exceptional circumstances.</p>
              </div>
              <button
                onClick={() => { if (!tideProfilesLoaded) loadTideProfiles(); }}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {tideProfilesLoaded ? "Loaded" : "Load Players"}
              </button>
            </div>

            {tideProfilesLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {tideProfilesLoaded && (
              <div className="space-y-2">
                {tideProfiles.map((player) => {
                  const isExpanded = expandedTidePlayerId === player.id;
                  const earnedIds = new Set(player.tides.map((t) => t.id));
                  return (
                    <div
                      key={player.id}
                      className="border border-border rounded-xl overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedTidePlayerId(isExpanded ? null : player.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-secondary text-sm">
                            {player.firstName} {player.lastName}
                          </span>
                          {player.tides.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                              {player.tides.length} tide{player.tides.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/10">
                          {TIDES.map((tide) => {
                            const TideIcon = tide.icon;
                            const has = earnedIds.has(tide.id);
                            const isPending =
                              (awardTide.isPending || removeTide.isPending);
                            return (
                              <div
                                key={tide.id}
                                className="flex items-center gap-3 py-1"
                              >
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: has ? `${tide.color}22` : "hsl(220 28% 14%)",
                                    border: `1.5px solid ${has ? tide.color + "66" : "hsl(220 28% 20%)"}`,
                                  }}
                                >
                                  <TideIcon className="h-3.5 w-3.5" style={{ color: has ? tide.color : "hsl(215 16% 40%)" }} strokeWidth={2} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-secondary leading-tight">{tide.label}</p>
                                  <p className="text-xs text-muted-foreground leading-tight">{tide.threshold}</p>
                                </div>
                                {has ? (
                                  <button
                                    disabled={isPending}
                                    onClick={() => removeTide.mutate({ profileId: player.id, tideId: tide.id })}
                                    className="text-xs px-3 py-1 rounded-lg font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                                  >
                                    Remove
                                  </button>
                                ) : (
                                  <button
                                    disabled={isPending}
                                    onClick={() => awardTide.mutate({ profileId: player.id, tideId: tide.id })}
                                    className="text-xs px-3 py-1 rounded-lg font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition-colors disabled:opacity-40"
                                  >
                                    Award
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Users</h2>
          {users && (
            <span className="ml-auto text-sm text-muted-foreground">
              {users.length} {users.length === 1 ? "user" : "users"}
            </span>
          )}
        </div>

        {usersLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-40" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
                <div className="h-9 bg-muted rounded-lg w-28" />
              </div>
            ))}
          </div>
        ) : users?.length ? (
          <div className="divide-y divide-border">
            {users.map((u) => {
              const currentRole = (u.role ?? "player") as Role;
              const isProtected = u.clerkUserId === user?.id;
              return (
                <div key={u.clerkUserId} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-secondary truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      {isProtected && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" title="Primary admin — role is fixed" />
                      )}
                    </div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${roleBadge[currentRole]}`}>
                      {roleLabel[currentRole]}
                    </span>
                  </div>
                  {isProtected ? (
                    <span className="text-xs text-muted-foreground italic px-3 py-2">Primary admin</span>
                  ) : (
                    <select
                      value={currentRole}
                      onChange={(e) => handleRoleChange(u.clerkUserId, e.target.value as Role)}
                      disabled={updateRole.isPending}
                      className="border border-border rounded-lg px-3 py-2 text-sm font-semibold bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{roleLabel[r]}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">No users found.</div>
        )}
      </div>

      <div className="card-base p-6 space-y-3">
        <h3 className="font-bold text-secondary">Role Permissions</h3>
        <div className="space-y-2 text-sm">
          {(
            [
              ["admin", "Full access — add games, enter scores, upload video, manage teams and users"],
              ["coach", "Can view all stats and game results"],
              ["player", "Default role — can create a profile and view all public content"],
            ] as const
          ).map(([role, desc]) => (
            <div key={role} className="flex items-start gap-3">
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${roleBadge[role]}`}>
                {roleLabel[role]}
              </span>
              <p className="text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
