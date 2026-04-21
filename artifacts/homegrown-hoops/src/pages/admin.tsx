import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useGetMyProfile, useListAdminUsers, useUpdateUserRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, User, Lock } from "lucide-react";

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

  const updateRole = useUpdateUserRole();

  async function handleRoleChange(clerkUserId: string, newRole: Role) {
    await updateRole.mutateAsync({
      clerkUserId,
      data: { role: newRole },
    });
    await qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
        <h1 className="font-display text-4xl md:text-5xl text-secondary">
          ADMIN PANEL
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles across the league.
        </p>
      </div>

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
                <div
                  key={u.clerkUserId}
                  className="flex items-center gap-4 px-6 py-4"
                >
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
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${roleBadge[currentRole]}`}
                    >
                      {roleLabel[currentRole]}
                    </span>
                  </div>

                  {isProtected ? (
                    <span className="text-xs text-muted-foreground italic px-3 py-2">
                      Primary admin
                    </span>
                  ) : (
                    <select
                      value={currentRole}
                      onChange={(e) =>
                        handleRoleChange(u.clerkUserId, e.target.value as Role)
                      }
                      disabled={updateRole.isPending}
                      className="border border-border rounded-lg px-3 py-2 text-sm font-semibold bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel[r]}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            No users found.
          </div>
        )}
      </div>

      <div className="card-base p-6 space-y-3">
        <h3 className="font-bold text-secondary">Role Permissions</h3>
        <div className="space-y-2 text-sm">
          {(
            [
              ["admin", "Full access — add games, edit results, manage all user roles"],
              ["coach", "Can view all stats and game results"],
              ["player", "Default role — can create a profile and view public content"],
            ] as const
          ).map(([role, desc]) => (
            <div key={role} className="flex items-start gap-3">
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${roleBadge[role]}`}
              >
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
