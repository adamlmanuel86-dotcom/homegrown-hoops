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
  useListPlayers,
  useListJerseyStubs,
  useClaimJerseyNumber,
  useListPendingAccounts,
  useApprovePendingAccount,
  useRejectPendingAccount,
  useResetArcadeSessions,
  customFetch,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Shield, User, Lock, Pencil, Save, X, Users, Trash2, AlertTriangle, Plus, CheckCircle, UserCheck, CalendarDays, Waves, ChevronDown, ChevronUp, Trophy, RotateCcw, Brain, Hash, Clock } from "lucide-react";
import { TIDES } from "@/components/recognition";



const ROLES = ["admin", "manager", "coach", "player"] as const;
type Role = typeof ROLES[number];

const roleBadge: Record<Role, string> = {
  admin: "bg-primary/10 text-primary font-bold",
  manager: "bg-purple-900/40 text-purple-300 font-semibold",
  coach: "bg-blue-900/40 text-blue-300 font-semibold",
  player: "bg-muted text-muted-foreground font-medium",
};

const roleLabel: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
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

const TEAM_COLORS = [
  // Oranges & Reds
  "#FF6B00", "#FF5722", "#F97316", "#E65100",
  "#C8102E", "#CE1141", "#BA0C2F", "#D50032",
  // Blues & Navies
  "#007AC1", "#1D428A", "#00538C", "#0057A8",
  "#132237", "#002B5C", "#003DA5", "#00285E",
  // Greens & Teals
  "#007A33", "#00843D", "#004B27", "#008348",
  "#00B2A9", "#009B77", "#418FDE", "#00B388",
  // Purples & Golds
  "#5C2F82", "#552583", "#7B2D8B", "#6336AC",
  "#FFC72C", "#FDB927", "#F9A01B", "#FDBB30",
  // Neutrals
  "#000000", "#1A1A1A", "#4A4A4A", "#808080",
  "#A0A0A0", "#C0C0C0", "#E8E8E8", "#FFFFFF",
];

function ColorSwatchPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      {label && <label className="label-upper block mb-2">{label}</label>}
      <div className="space-y-2.5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg border-2 border-border flex-shrink-0"
            style={{ background: value }}
          />
          <span className="text-sm font-mono text-muted-foreground">{value.toUpperCase()}</span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {TEAM_COLORS.map((color) => {
            const selected = value.toUpperCase() === color.toUpperCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange(color)}
                className="w-8 h-8 rounded-md transition-transform hover:scale-110 focus:outline-none"
                style={{
                  background: color,
                  border: selected ? "2px solid white" : "2px solid transparent",
                  boxShadow: selected ? `0 0 0 2px ${color}, 0 0 0 4px rgba(255,255,255,0.3)` : "inset 0 0 0 1px rgba(0,0,0,0.15)",
                  transform: selected ? "scale(1.15)" : undefined,
                }}
                title={color}
              />
            );
          })}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-10 rounded border border-border cursor-pointer p-0.5 bg-transparent"
          />
          <span className="text-xs text-muted-foreground">Custom color</span>
        </label>
      </div>
    </div>
  );
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

  const { data: games, isLoading: gamesLoading } = useListGames(undefined, {
    query: { enabled: isAdmin === true },
  });

  const { data: allPlayers } = useListPlayers(undefined, {
    query: { enabled: isAdmin === true },
  });

  const updateRole = useUpdateUserRole();
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const deletePlayer = useMutation({
    mutationFn: async (playerId: number) => {
      await customFetch(`/api/players/${playerId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      setConfirmDeletePlayerId(null);
      qc.invalidateQueries({ queryKey: ["/api/players"] });
    },
  });

  const deleteGame = useMutation({
    mutationFn: async (gameId: number) => {
      await customFetch(`/api/games/${gameId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/games"] }),
  });

  // Load tide profiles once when admin is confirmed.
  useEffect(() => {
    if (!isAdmin) return;
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
      const data = await customFetch<{ id: number; firstName: string; lastName: string; tides: { id: string; earnedAt: string }[] | null }[]>(`/api/admin/profiles-tides`);
      setTideProfiles(data.map((p) => ({ ...p, tides: p.tides ?? [] })));
      setTideProfilesLoaded(true);
    } catch {
      // silently ignore — UI handles empty state
    } finally {
      setTideProfilesLoading(false);
    }
  }

  const calculateSeasonTides = useMutation({
    mutationFn: async (season: string) => {
      return customFetch(`/api/admin/season-tides/${encodeURIComponent(season)}`, { method: "POST" });
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
      return customFetch(`/api/admin/profiles/${profileId}/tides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tideId }),
      });
    },
    onSuccess: () => {
      loadTideProfiles();
      qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
  });

  const removeTide = useMutation({
    mutationFn: async ({ profileId, tideId }: { profileId: number; tideId: string }) => {
      return customFetch(`/api/admin/profiles/${profileId}/tides/${encodeURIComponent(tideId)}`, {
        method: "DELETE",
      });
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
  const [newSeasonName, setNewSeasonName] = useState("");

  const [seasonHistoryTeamId, setSeasonHistoryTeamId] = useState<number | null>(null);
  const [teamSeasonsMap, setTeamSeasonsMap] = useState<Map<number, { seasons: string[]; currentSeason: string | null }>>(new Map());
  const [seasonDeleteConfirmKey, setSeasonDeleteConfirmKey] = useState<string | null>(null);
  const [seasonDeletePending, setSeasonDeletePending] = useState(false);
  const [seasonDeleteError, setSeasonDeleteError] = useState<string | null>(null);

  const [rosterTeamId, setRosterTeamId] = useState<number | null>(null);
  const [confirmDeletePlayerId, setConfirmDeletePlayerId] = useState<number | null>(null);
  const [confirmClearTeamId, setConfirmClearTeamId] = useState<number | null>(null);
  const [confirmWipeAllPlayers, setConfirmWipeAllPlayers] = useState(false);
  const [confirmWipeOrphans, setConfirmWipeOrphans] = useState(false);
  const [orphanResult, setOrphanResult] = useState<string | null>(null);

  const wipeAllPlayers = useMutation({
    mutationFn: async () => {
      await customFetch(`/api/admin/players/all`, { method: "DELETE" });
    },
    onSuccess: () => {
      setConfirmWipeAllPlayers(false);
      qc.invalidateQueries({ queryKey: ["/api/players"] });
    },
  });

  const wipeOrphanedPlayers = useMutation({
    mutationFn: async () => {
      const r = await customFetch(`/api/admin/players/orphaned`, { method: "DELETE" });
      return r.json() as Promise<{ deleted: number }>;
    },
    onSuccess: (data) => {
      setConfirmWipeOrphans(false);
      setOrphanResult(`Removed ${data.deleted} player${data.deleted === 1 ? "" : "s"} with no account`);
      qc.invalidateQueries({ queryKey: ["/api/players"] });
      setTimeout(() => setOrphanResult(null), 4000);
    },
  });

  const clearRoster = useMutation({
    mutationFn: async (teamId: number) => {
      await customFetch(`/api/admin/teams/${teamId}/players`, { method: "DELETE" });
    },
    onSuccess: () => {
      setConfirmClearTeamId(null);
      setConfirmDeletePlayerId(null);
      qc.invalidateQueries({ queryKey: ["/api/players"] });
    },
  });

  const [claimJerseyUserId, setClaimJerseyUserId] = useState<string | null>(null);
  const [claimJerseyForm, setClaimJerseyForm] = useState<{ jerseyNumber: string; teamId: string; season: string }>({ jerseyNumber: "", teamId: "", season: "" });
  const [claimJerseyError, setClaimJerseyError] = useState<string | null>(null);
  const { data: jerseyStubs } = useListJerseyStubs();
  const { data: pendingAccounts, refetch: refetchPending } = useListPendingAccounts({
    query: { enabled: isAdmin === true },
  });
  const approvePending = useApprovePendingAccount();
  const rejectPending = useRejectPendingAccount();
  const claimJersey = useClaimJerseyNumber({
    mutation: {
      onSuccess: () => {
        setClaimJerseyUserId(null);
        setClaimJerseyError(null);
        qc.invalidateQueries({ queryKey: ["/api/profiles"] });
        qc.invalidateQueries({ queryKey: ["/api/admin/jersey-stubs"] });
      },
      onError: (err: Error) => {
        setClaimJerseyError(err.message ?? "Failed to claim jersey");
      },
    },
  });

  const [confirmResetArcade, setConfirmResetArcade] = useState(false);
  const [confirmingResetIsoBallId, setConfirmingResetIsoBallId] = useState<string | null>(null);
  const resetArcade = useResetArcadeSessions({
    mutation: {
      onSuccess: () => {
        setConfirmResetArcade(false);
        qc.invalidateQueries({ queryKey: ["/api/arcade/leaderboard"] });
        qc.invalidateQueries({ queryKey: ["/api/arcade/my-stats"] });
        qc.invalidateQueries({ queryKey: ["/api/iso-ball/leaderboard"] });
        qc.invalidateQueries({ queryKey: ["/api/profiles"] });
      },
    },
  });

  const resetIsoBall = useMutation({
    mutationFn: async (clerkUserId: string) => {
      await customFetch(`/api/iso-ball/sessions/${encodeURIComponent(clerkUserId)}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_data, clerkUserId) => {
      setConfirmingResetIsoBallId(null);
      qc.invalidateQueries({ queryKey: ["isoBallProfile", clerkUserId] });
      qc.invalidateQueries({ queryKey: ["/api/iso-ball/leaderboard"] });
      qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
  });

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
      const data = await customFetch<{ season: string; winners: TideWinner[] }>(`/api/admin/teams/${teamId}/season-tides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
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
      await customFetch(`/api/admin/teams/${teamId}/new-season-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSeasonName: newSeasonName.trim() }),
      });
      setNewSeasonResetDone(true);
      loadTideProfiles();
      await qc.invalidateQueries({ queryKey: ["/api/profiles"] });
      await qc.invalidateQueries({ queryKey: ["/api/games"] });
      // Refresh season history so the new season shows as Active immediately
      if (seasonHistoryTeamId !== null) loadTeamSeasons(seasonHistoryTeamId);
    } catch (e: unknown) {
      setNewSeasonResetError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setNewSeasonResetPending(false);
    }
  }

  async function loadTeamSeasons(teamId: number) {
    try {
      const data = await customFetch<{ seasons: string[]; currentSeason: string | null }>(`/api/admin/teams/${teamId}/seasons`);
      setTeamSeasonsMap((prev) => new Map(prev).set(teamId, data));
    } catch {
      // silently ignore — UI handles empty state
    }
  }

  async function handleDeleteSeason(teamId: number, season: string) {
    setSeasonDeletePending(true);
    setSeasonDeleteError(null);
    try {
      await customFetch(
        `/api/admin/teams/${teamId}/seasons/${encodeURIComponent(season)}`,
        { method: "DELETE" }
      );
      setSeasonDeleteConfirmKey(null);
      await loadTeamSeasons(teamId);
      await qc.invalidateQueries({ queryKey: ["/api/games"] });
      await qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    } catch (e: unknown) {
      setSeasonDeleteError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSeasonDeletePending(false);
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

      {/* Pending Accounts Queue */}
      {pendingAccounts && pendingAccounts.length > 0 && (
        <div className="card-base overflow-hidden border-2 border-yellow-500">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-yellow-500/10">
            <Clock className="h-5 w-5 text-yellow-500" />
            <h2 className="font-bold text-secondary">Pending Accounts</h2>
            <span className="ml-auto text-xs font-bold bg-yellow-500 text-black px-2 py-0.5 rounded-full">
              {pendingAccounts.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {pendingAccounts.map((account) => (
              <div key={account.clerkUserId} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-secondary truncate">
                    {account.firstName} {account.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested:{" "}
                    <span className="font-semibold text-yellow-600 capitalize">
                      {account.requestedRole ?? "unknown"}
                    </span>
                    {" · "}
                    {new Date(account.createdAt).toLocaleDateString()}
                  </p>
                  {account.requestedRole === "manager" && account.requestedTeamInfo && (() => {
                    const info = account.requestedTeamInfo as { teamName?: string; league?: string; city?: string; roster?: Array<{ jerseyNumber: string; playerName: string }> };
                    return (
                      <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
                        {info.teamName && (
                          <p>
                            <span className="font-semibold text-white/70">Team:</span>{" "}
                            {info.teamName}
                            {info.league ? ` · ${info.league}` : ""}
                            {info.city ? ` · ${info.city}` : ""}
                          </p>
                        )}
                        {info.roster && info.roster.length > 0 && (
                          <p>
                            <span className="font-semibold text-white/70">Roster:</span>{" "}
                            {info.roster.map((r) => r.playerName || `#${r.jerseyNumber}`).filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      await approvePending.mutateAsync({ clerkUserId: account.clerkUserId });
                      void refetchPending();
                    }}
                    disabled={approvePending.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600/15 border border-green-600/40 text-green-400 hover:bg-green-600/25 transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      await rejectPending.mutateAsync({ clerkUserId: account.clerkUserId });
                      void refetchPending();
                    }}
                    disabled={rejectPending.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/15 border border-red-600/40 text-red-400 hover:bg-red-600/25 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Quick Links</h2>
        </div>
        <div className="flex flex-wrap gap-3 px-6 py-4">
          <a
            href="/track-game"
            className="inline-flex items-center gap-2 border-2 border-border px-4 py-2 text-sm font-bold hover:bg-muted shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          >
            📋 Track a Game
          </a>
          <a
            href="/admin/pending-games"
            className="inline-flex items-center gap-2 bg-yellow-600 text-white border-2 border-border px-4 py-2 text-sm font-bold hover:opacity-90 shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          >
            ⏳ Pending Games
          </a>
        </div>
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
                              try {
                                await deleteGame.mutateAsync(g.id);
                                setConfirmingDeleteGameId(null);
                              } catch (err) {
                                console.error("Delete game failed:", err);
                                alert(`Failed to delete game: ${err instanceof Error ? err.message : String(err)}`);
                              }
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
          {/* Delete players with no accounts */}
          {orphanResult && (
            <span className="ml-auto text-xs font-semibold text-green-500">{orphanResult}</span>
          )}
          {!confirmWipeOrphans && !confirmWipeAllPlayers && !orphanResult && (
            <button
              onClick={() => setConfirmWipeOrphans(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Unlinked Players
            </button>
          )}
          {confirmWipeOrphans && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Remove players with no account?</span>
              <button
                onClick={() => wipeOrphanedPlayers.mutate()}
                disabled={wipeOrphanedPlayers.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                {wipeOrphanedPlayers.isPending ? "Removing…" : "Yes, Remove"}
              </button>
              <button
                onClick={() => setConfirmWipeOrphans(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          {/* Remove ALL players (nuclear option) */}
          {!confirmWipeAllPlayers && !confirmWipeOrphans && (
            <button
              onClick={() => setConfirmWipeAllPlayers(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove All Players
            </button>
          )}
          {confirmWipeAllPlayers && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Remove ALL players from every team?</span>
              <button
                onClick={() => wipeAllPlayers.mutate()}
                disabled={wipeAllPlayers.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                {wipeAllPlayers.isPending ? "Removing…" : "Yes, Remove All"}
              </button>
              <button
                onClick={() => setConfirmWipeAllPlayers(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={() => { setShowAddTeam((v) => !v); setAddTeamError(null); }}
            className={`${confirmWipeAllPlayers ? "" : "ml-auto "}flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors`}
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
              <div className="sm:col-span-2">
                <ColorSwatchPicker
                  label="Primary Color"
                  value={newTeam.primaryColor}
                  onChange={(c) => setNewTeam((s) => ({ ...s, primaryColor: c }))}
                />
              </div>
              <div className="sm:col-span-2">
                <ColorSwatchPicker
                  label="Secondary Color"
                  value={newTeam.secondaryColor}
                  onChange={(c) => setNewTeam((s) => ({ ...s, secondaryColor: c }))}
                />
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input value={teamEdit.name} onChange={(e) => setTeamEdit((s) => ({ ...s, name: e.target.value }))} placeholder="Team name" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm" />
                        <input value={teamEdit.city} onChange={(e) => setTeamEdit((s) => ({ ...s, city: e.target.value }))} placeholder="City" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm" />
                        <input value={teamEdit.abbreviation} onChange={(e) => setTeamEdit((s) => ({ ...s, abbreviation: e.target.value }))} placeholder="Abbr." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <ColorSwatchPicker
                          label="Primary Color"
                          value={teamEdit.primaryColor}
                          onChange={(c) => setTeamEdit((s) => ({ ...s, primaryColor: c }))}
                        />
                        <ColorSwatchPicker
                          label="Secondary Color"
                          value={teamEdit.secondaryColor}
                          onChange={(c) => setTeamEdit((s) => ({ ...s, secondaryColor: c }))}
                        />
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
                            if (opening) { setNewSeasonResetDone(false); setNewSeasonResetError(null); setNewSeasonName(""); }
                            setEndOfSeasonTeamId(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Start New Season
                        </button>
                        <button
                          onClick={() => {
                            const opening = seasonHistoryTeamId !== team.id;
                            setSeasonHistoryTeamId(opening ? team.id : null);
                            setSeasonDeleteConfirmKey(null);
                            setSeasonDeleteError(null);
                            if (opening) loadTeamSeasons(team.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          Season History
                        </button>
                        <button
                          onClick={() => {
                            setRosterTeamId(rosterTeamId === team.id ? null : team.id);
                            setConfirmDeletePlayerId(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Roster
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

                      {/* Season History panel */}
                      {seasonHistoryTeamId === team.id && (() => {
                        const info = teamSeasonsMap.get(team.id);
                        const archivedSeasons = info
                          ? info.seasons.filter((s) => s !== info.currentSeason)
                          : [];
                        return (
                          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-bold">Season History — {team.name}</p>
                              </div>
                              <button
                                onClick={() => { setSeasonHistoryTeamId(null); setSeasonDeleteConfirmKey(null); setSeasonDeleteError(null); }}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            {info && info.currentSeason && (
                              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-primary">{info.currentSeason}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">Active</span>
                                </div>
                                <span className="text-xs text-muted-foreground">Cannot delete active season</span>
                              </div>
                            )}

                            {archivedSeasons.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                {info ? "No archived seasons yet." : "Loading…"}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {archivedSeasons.map((s) => {
                                  const key = `${team.id}:${s}`;
                                  const isConfirming = seasonDeleteConfirmKey === key;
                                  return (
                                    <div key={s} className="space-y-2">
                                      <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background">
                                        <div className="flex items-center gap-2">
                                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="text-xs font-semibold">{s}</span>
                                          <span className="text-xs text-muted-foreground">Archived</span>
                                        </div>
                                        {!isConfirming && (
                                          <button
                                            onClick={() => { setSeasonDeleteConfirmKey(key); setSeasonDeleteError(null); }}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                      {isConfirming && (
                                        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 space-y-2.5">
                                          <div className="flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-muted-foreground">
                                              This will permanently delete all data for <span className="font-bold text-foreground">{s}</span> including games, stats and Tides. This cannot be undone. Are you sure?
                                            </p>
                                          </div>
                                          {seasonDeleteError && <p className="text-xs text-red-400 font-medium">{seasonDeleteError}</p>}
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleDeleteSeason(team.id, s)}
                                              disabled={seasonDeletePending}
                                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                              {seasonDeletePending ? "Deleting…" : "Yes, Delete Season"}
                                            </button>
                                            <button
                                              onClick={() => { setSeasonDeleteConfirmKey(null); setSeasonDeleteError(null); }}
                                              disabled={seasonDeletePending}
                                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                                            >
                                              Cancel
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
                        );
                      })()}

                      {/* Roster panel */}
                      {rosterTeamId === team.id && (() => {
                        const teamPlayers = (allPlayers ?? []).filter((p) => p.teamId === team.id);
                        return (
                          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-bold">Roster — {team.name}</p>
                                <span className="text-xs text-muted-foreground">({teamPlayers.length} players)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {teamPlayers.length > 0 && confirmClearTeamId !== team.id && (
                                  <button
                                    onClick={() => setConfirmClearTeamId(team.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Clear All
                                  </button>
                                )}
                                <button
                                  onClick={() => { setRosterTeamId(null); setConfirmDeletePlayerId(null); setConfirmClearTeamId(null); }}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            {confirmClearTeamId === team.id && (
                              <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Remove <span className="font-bold text-foreground">all {teamPlayers.length} players</span> from {team.name}? This erases all their stats too. Cannot be undone.
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => clearRoster.mutate(team.id)}
                                    disabled={clearRoster.isPending}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    {clearRoster.isPending ? "Clearing…" : "Yes, Clear All"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmClearTeamId(null)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            {teamPlayers.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">No players on this roster.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {teamPlayers.map((player) => {
                                  const isConfirming = confirmDeletePlayerId === player.id;
                                  return (
                                    <div key={player.id}>
                                      {isConfirming ? (
                                        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                            <p className="text-xs text-muted-foreground">
                                              Delete <span className="font-bold text-foreground">{player.firstName} {player.lastName}</span>? This removes them from the roster and erases all their stats. Cannot be undone.
                                            </p>
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={async () => {
                                                try {
                                                  await deletePlayer.mutateAsync(player.id);
                                                } catch (err) {
                                                  alert(`Failed to delete player: ${err instanceof Error ? err.message : String(err)}`);
                                                }
                                              }}
                                              disabled={deletePlayer.isPending}
                                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                              {deletePlayer.isPending ? "Deleting…" : "Yes, Delete"}
                                            </button>
                                            <button
                                              onClick={() => setConfirmDeletePlayerId(null)}
                                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background">
                                          <div className="flex items-center gap-2">
                                            {player.number != null && (
                                              <span className="text-xs font-bold text-muted-foreground w-6 text-right">#{player.number}</span>
                                            )}
                                            <span className="text-sm font-semibold">{player.firstName} {player.lastName}</span>
                                          </div>
                                          <button
                                            onClick={() => setConfirmDeletePlayerId(player.id)}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                            Remove
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* New Season Reset drawer */}
                      {newSeasonResetTeamId === team.id && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                          {newSeasonResetDone ? (
                            <>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                                <p className="text-sm font-bold text-green-300">
                                  Season archived.{newSeasonName ? ` New season "${newSeasonName}" is ready.` : " All data preserved. Ready for a fresh season."}
                                </p>
                              </div>
                              {newSeasonName && (
                                <p className="text-xs text-muted-foreground">
                                  Use <span className="font-bold text-foreground">{newSeasonName}</span> as the season name when creating new games.
                                </p>
                              )}
                              <button
                                onClick={() => { setNewSeasonResetTeamId(null); setNewSeasonResetDone(false); setNewSeasonName(""); }}
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
                                  <p className="text-sm font-bold text-red-300 mb-1">Start New Season — {team.name}</p>
                                  <p className="text-xs text-muted-foreground">This will archive the current season and start a fresh new season. All historical data is preserved and viewable. This cannot be undone.</p>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Season Name</label>
                                <input
                                  type="text"
                                  value={newSeasonName}
                                  onChange={(e) => { setNewSeasonName(e.target.value); setNewSeasonResetError(null); }}
                                  placeholder="e.g. 2026-27"
                                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-red-500/50 placeholder:text-muted-foreground/50"
                                />
                              </div>
                              {newSeasonResetError && <p className="text-xs text-red-400 font-medium">{newSeasonResetError}</p>}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (!newSeasonName.trim()) {
                                      setNewSeasonResetError("Please enter the new season name before continuing.");
                                      return;
                                    }
                                    runNewSeasonReset(team.id);
                                  }}
                                  disabled={newSeasonResetPending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  {newSeasonResetPending ? "Archiving…" : `Yes, Start${newSeasonName.trim() ? ` ${newSeasonName.trim()}` : " New Season"}`}
                                </button>
                                <button
                                  onClick={() => { setNewSeasonResetTeamId(null); setNewSeasonResetError(null); setNewSeasonName(""); }}
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
              const isResettingIsoBall = confirmingResetIsoBallId === u.clerkUserId;

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
                            <button
                              onClick={() => {
                                if (claimJerseyUserId === u.clerkUserId) {
                                  setClaimJerseyUserId(null);
                                } else {
                                  setClaimJerseyUserId(u.clerkUserId);
                                  setClaimJerseyForm({ jerseyNumber: "", teamId: "", season: "" });
                                  setClaimJerseyError(null);
                                }
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all touch-manipulation ${claimJerseyUserId === u.clerkUserId ? "border-orange-500/40 bg-orange-500/10 text-orange-300" : "border-border hover:border-orange-500/30 hover:bg-orange-500/5 text-muted-foreground hover:text-orange-300"}`}
                            >
                              <Hash className="h-3.5 w-3.5" />
                              Claim #
                            </button>
                            <button
                              onClick={() => setConfirmingResetIsoBallId(isResettingIsoBall ? null : u.clerkUserId)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all touch-manipulation ${isResettingIsoBall ? "border-purple-500/40 bg-purple-500/10 text-purple-300" : "border-border hover:border-purple-500/30 hover:bg-purple-500/5 text-muted-foreground hover:text-purple-300"}`}
                            >
                              <Brain className="h-3.5 w-3.5" />
                              Reset IQ
                            </button>
                            <button onClick={() => setConfirmingDeleteProfileId(u.clerkUserId)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors touch-manipulation">Delete</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Reset Ball Knowledge Drawer ── */}
                  {isResettingIsoBall && !isEditing && !isConfirming && (
                    <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-purple-500/20 bg-purple-950/20">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border-b border-purple-500/20">
                        <Brain className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Reset Ball Knowledge</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-purple-200/80 leading-relaxed">
                            This will reset this player's Ball Knowledge score to zero and remove The Playbook Stamp if earned. This cannot be undone. Are you sure?
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => resetIsoBall.mutate(u.clerkUserId)}
                            disabled={resetIsoBall.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 active:scale-95 text-white transition-all touch-manipulation disabled:opacity-50"
                          >
                            <Brain className="h-3.5 w-3.5" />
                            {resetIsoBall.isPending ? "Resetting…" : "Yes, reset"}
                          </button>
                          <button
                            onClick={() => setConfirmingResetIsoBallId(null)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted active:scale-95 transition-all touch-manipulation"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Claim Jersey Drawer ── */}
                  {claimJerseyUserId === u.clerkUserId && !isEditing && !isConfirming && (
                    <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-orange-500/20 bg-orange-950/10">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20">
                        <Hash className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Claim Jersey Number</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-orange-200/70 leading-relaxed">
                          Link a jersey stub to <strong className="text-orange-200">{u.firstName} {u.lastName}</strong>. All accumulated stats, stamps and tides will apply instantly. Select from an existing unclaimed stub or type a number manually.
                        </p>
                        {jerseyStubs && jerseyStubs.filter((s) => !s.claimedByClerkUserId).length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unclaimed stubs</p>
                            <div className="flex flex-wrap gap-1.5">
                              {jerseyStubs.filter((s) => !s.claimedByClerkUserId).map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => setClaimJerseyForm({ jerseyNumber: String(s.jerseyNumber), teamId: String(s.teamId), season: s.season })}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${claimJerseyForm.jerseyNumber === String(s.jerseyNumber) && claimJerseyForm.teamId === String(s.teamId) && claimJerseyForm.season === s.season ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-border hover:border-orange-500/40 text-muted-foreground hover:text-orange-300"}`}
                                >
                                  #{s.jerseyNumber} · {s.teamName ?? `Team ${s.teamId}`} · {s.season}
                                  <span className="ml-1 opacity-60">{s.gamesPlayed}G {s.totalPoints}PTS</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Jersey #</label>
                            <input
                              type="number"
                              placeholder="14"
                              className="w-full mt-0.5 border border-border bg-background px-2 py-1.5 text-xs rounded-lg focus:outline-none focus:border-orange-500"
                              value={claimJerseyForm.jerseyNumber}
                              onChange={(e) => setClaimJerseyForm((f) => ({ ...f, jerseyNumber: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Team</label>
                            <select
                              className="w-full mt-0.5 border border-border bg-background px-2 py-1.5 text-xs rounded-lg focus:outline-none focus:border-orange-500"
                              value={claimJerseyForm.teamId}
                              onChange={(e) => setClaimJerseyForm((f) => ({ ...f, teamId: e.target.value }))}
                            >
                              <option value="">Select…</option>
                              {teams?.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Season</label>
                            <input
                              type="text"
                              placeholder="2025-26"
                              className="w-full mt-0.5 border border-border bg-background px-2 py-1.5 text-xs rounded-lg focus:outline-none focus:border-orange-500"
                              value={claimJerseyForm.season}
                              onChange={(e) => setClaimJerseyForm((f) => ({ ...f, season: e.target.value }))}
                            />
                          </div>
                        </div>
                        {claimJerseyError && (
                          <p className="text-xs text-red-400">{claimJerseyError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            disabled={claimJersey.isPending || !claimJerseyForm.jerseyNumber || !claimJerseyForm.teamId || !claimJerseyForm.season}
                            onClick={() => {
                              setClaimJerseyError(null);
                              claimJersey.mutate({
                                clerkUserId: u.clerkUserId,
                                data: {
                                  jerseyNumber: parseInt(claimJerseyForm.jerseyNumber, 10),
                                  teamId: parseInt(claimJerseyForm.teamId, 10),
                                  season: claimJerseyForm.season,
                                },
                              });
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 active:scale-95 text-white transition-all touch-manipulation disabled:opacity-50"
                          >
                            <Hash className="h-3.5 w-3.5" />
                            {claimJersey.isPending ? "Claiming…" : "Claim Jersey"}
                          </button>
                          <button
                            onClick={() => setClaimJerseyUserId(null)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted active:scale-95 transition-all touch-manipulation"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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

      {/* ── Arcade Reset ───────────────────────────────────────────────── */}
      <div className="card-base overflow-hidden border-2 border-red-700">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-red-900/20">
          <RotateCcw className="h-5 w-5 text-red-400" />
          <h2 className="font-bold text-secondary">Reset Arcade Stats</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground mb-4">
            Clears <span className="font-semibold text-white">all</span> arcade session data and Iso-Ball scores for every player. Leaderboards will be empty. This cannot be undone.
          </p>
          {!confirmResetArcade ? (
            <button
              onClick={() => setConfirmResetArcade(true)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-red-600 text-red-400 font-bold text-sm hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Reset All Arcade Stats
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-red-400">
                Are you sure? Every player's arcade history and leaderboard positions will be wiped.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => resetArcade.mutate()}
                  disabled={resetArcade.isPending}
                  className="px-4 py-2 bg-red-700 border-2 border-red-600 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {resetArcade.isPending ? "Resetting…" : "Yes, Reset All"}
                </button>
                <button
                  onClick={() => setConfirmResetArcade(false)}
                  disabled={resetArcade.isPending}
                  className="px-4 py-2 border-2 border-border text-muted-foreground font-bold text-sm hover:border-white/40 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {resetArcade.isSuccess && (
            <p className="text-sm text-green-400 mt-3 font-medium">✓ All arcade stats cleared.</p>
          )}
          {resetArcade.isError && (
            <p className="text-sm text-red-400 mt-3 font-medium">Failed to reset. Please try again.</p>
          )}
        </div>
      </div>

      </div>
    </div>
  );
}
