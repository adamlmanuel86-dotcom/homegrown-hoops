import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetMyProfile,
  useListAdminUsers,
  useUpdateUserRole,
  useListTeams,
  useUpdateTeam,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, User, Lock, Pencil, Save, X, Users } from "lucide-react";

const ROLES = ["admin", "coach", "player"] as const;
type Role = typeof ROLES[number];

const roleBadge: Record<Role, string> = {
  admin: "bg-primary/10 text-primary font-bold",
  coach: "bg-blue-50 text-blue-700 font-semibold",
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

  const updateRole = useUpdateUserRole();
  const updateTeam = useUpdateTeam();

  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [teamEdit, setTeamEdit] = useState<TeamEditState>({ name: "", city: "", abbreviation: "", primaryColor: "#FF6B00", secondaryColor: "#132237" });
  const [teamSaveError, setTeamSaveError] = useState<string | null>(null);

  async function handleRoleChange(clerkUserId: string, newRole: Role) {
    await updateRole.mutateAsync({ clerkUserId, data: { role: newRole } });
    await qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
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

      {/* Team Management */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Teams</h2>
          {teams && (
            <span className="ml-auto text-sm text-muted-foreground">
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
          )}
        </div>

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
                  ) : (
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
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
