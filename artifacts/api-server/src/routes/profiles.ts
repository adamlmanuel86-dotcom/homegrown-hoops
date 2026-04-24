import { Router, type IRouter } from "express";
import { eq, count, and, isNull, ne } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable, playersTable, gamePlayerStatsTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { isProtectedAdmin } from "../lib/adminGuard";

/**
 * Full roster sync when a profile is created or updated.
 * - Removes any player row for the OLD name+team combination.
 * - Removes any player rows for the NEW name that belong to a DIFFERENT team
 *   (handles name changes where an old row would otherwise linger).
 * - If a newTeamId is provided, upserts the player row for new name+team.
 * - If newTeamId is null/undefined, the player is left with no roster entry
 *   (they will not appear on any team page).
 */
export async function syncPlayerForTeamChange(
  oldFirstName: string | null,
  oldLastName: string | null,
  oldTeamId: number | null | undefined,
  newFirstName: string,
  newLastName: string,
  newTeamId: number | null | undefined,
  number?: string | null,
) {
  // 1. Remove the old team's player row (if the old team existed and is now different)
  if (oldFirstName && oldLastName && oldTeamId && oldTeamId !== newTeamId) {
    await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.firstName, oldFirstName),
          eq(playersTable.lastName, oldLastName),
          eq(playersTable.teamId, oldTeamId)
        )
      );
  }

  // 2. If the name changed, remove any old-name row on the new team too
  if (
    oldFirstName && oldLastName &&
    (oldFirstName !== newFirstName || oldLastName !== newLastName) &&
    newTeamId
  ) {
    await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.firstName, oldFirstName),
          eq(playersTable.lastName, oldLastName),
          eq(playersTable.teamId, newTeamId)
        )
      );
  }

  // 3. If no new team — nothing more to do; player won't appear on any roster
  if (!newTeamId || !newFirstName || !newLastName) return;

  // 4. Remove any stale rows for new name on a DIFFERENT team (prevents duplicates)
  await db
    .delete(playersTable)
    .where(
      and(
        eq(playersTable.firstName, newFirstName),
        eq(playersTable.lastName, newLastName),
        ne(playersTable.teamId, newTeamId)
      )
    );

  // 5. Upsert the correct player row for new name + new team
  const [existing] = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(
      and(
        eq(playersTable.firstName, newFirstName),
        eq(playersTable.lastName, newLastName),
        eq(playersTable.teamId, newTeamId)
      )
    );

  if (!existing) {
    await db.insert(playersTable).values({ firstName: newFirstName, lastName: newLastName, teamId: newTeamId, number: number ?? null });
  } else if (number !== undefined) {
    await db.update(playersTable)
      .set({ number: number ?? null })
      .where(eq(playersTable.id, existing.id));
  }
}

import {
  CreateMyProfileBody,
  UpdateMyProfileBody,
  UpdateProfileBody,
  GetMyProfileResponse,
  GetProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profiles", async (_req, res): Promise<void> => {
  const profiles = await db
    .select()
    .from(userProfilesTable)
    .where(ne(userProfilesTable.role, "parent"))
    .orderBy(userProfilesTable.lastName);
  res.json(serializeRows(profiles));
});

function requireAuth(
  req: Parameters<Parameters<typeof router.use>[0]>[0],
  res: Parameters<Parameters<typeof router.use>[0]>[1]
): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

router.get("/profiles/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  // If no profile exists yet, check if this is a protected admin email.
  // If so, auto-create a stub admin profile so they never get locked out.
  if (!profile) {
    const protected_ = await isProtectedAdmin(userId);
    if (protected_) {
      let firstName = "Admin";
      let lastName = "";
      try {
        const user = await (await import("@clerk/express")).clerkClient.users.getUser(userId);
        firstName = user.firstName ?? "Admin";
        lastName = user.lastName ?? "";
      } catch {
        // keep defaults
      }
      const [created] = await db
        .insert(userProfilesTable)
        .values({ clerkUserId: userId, firstName, lastName, isAdmin: true, role: "admin" })
        .returning();
      res.json(GetMyProfileResponse.parse(serializeRow(created)));
      return;
    }
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // Profile exists — ensure protected admin emails are always admin
  if (profile.role !== "admin") {
    const protected_ = await isProtectedAdmin(userId);
    if (protected_) {
      const [upgraded] = await db
        .update(userProfilesTable)
        .set({ role: "admin", isAdmin: true, updatedAt: new Date() })
        .where(eq(userProfilesTable.clerkUserId, userId))
        .returning();
      res.json(GetMyProfileResponse.parse(serializeRow(upgraded)));
      return;
    }
  }

  res.json(GetMyProfileResponse.parse(serializeRow(profile)));
});

router.post("/profiles/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (existing.length > 0) {
    res.status(409).json({ error: "Profile already exists. Use PUT /profiles/me to update." });
    return;
  }

  const protected_ = await isProtectedAdmin(userId);
  const [{ total }] = await db.select({ total: count() }).from(userProfilesTable);
  const isFirstUser = Number(total) === 0;
  const shouldBeAdmin = protected_ || isFirstUser;

  // Determine role: admin overrides everything; otherwise use requested role or default to "player"
  const requestedRole = parsed.data.role;
  const role = shouldBeAdmin ? "admin" : (requestedRole === "parent" ? "parent" : "player");

  // Strip the role field from the insert data (it's handled separately)
  const { role: _r, ...insertData } = parsed.data;

  const [profile] = await db
    .insert(userProfilesTable)
    .values({ ...insertData, clerkUserId: userId, isAdmin: shouldBeAdmin, role })
    .returning();

  // Parents are not players — skip roster sync so they never appear on rosters
  if (role !== "parent") {
    await syncPlayerForTeamChange(null, null, null, profile.firstName, profile.lastName, profile.teamId ?? undefined, profile.number ?? null);
  }

  res.status(201).json(GetMyProfileResponse.parse(serializeRow(profile)));
});

router.put("/profiles/me", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Capture old state so we can remove stale roster entries
  const [oldProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  const [profile] = await db
    .update(userProfilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, userId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // Skip roster sync for parents
  if (profile.role !== "parent") {
    await syncPlayerForTeamChange(
      oldProfile?.firstName ?? null,
      oldProfile?.lastName ?? null,
      oldProfile?.teamId ?? undefined,
      profile.firstName,
      profile.lastName,
      profile.teamId ?? undefined,
      profile.number ?? null,
    );
  }

  res.json(GetMyProfileResponse.parse(serializeRow(profile)));
});

// Link or unlink an athlete to a parent account
router.put("/profiles/me/linked-athlete", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { playerId } = req.body as { playerId: number | null };

  const [profile] = await db
    .update(userProfilesTable)
    .set({ linkedPlayerId: playerId ?? null, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, userId))
    .returning({ linkedPlayerId: userProfilesTable.linkedPlayerId });

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({ linkedPlayerId: profile.linkedPlayerId });
});

// Get the full linked athlete data for the signed-in parent
router.get("/profiles/me/linked-athlete", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [myProfile] = await db
    .select({ linkedPlayerId: userProfilesTable.linkedPlayerId })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (!myProfile?.linkedPlayerId) {
    res.json(null);
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, myProfile.linkedPlayerId));

  if (!player) {
    res.json(null);
    return;
  }

  // Aggregate career stats for this player
  const rows = await db
    .select()
    .from(gamePlayerStatsTable)
    .where(eq(gamePlayerStatsTable.playerId, player.id));

  const gamesPlayed = rows.length;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const totalPoints    = rows.reduce((s, r) => s + r.points, 0);
  const totalRebounds  = rows.reduce((s, r) => s + r.rebounds, 0);
  const totalAssists   = rows.reduce((s, r) => s + r.assists, 0);
  const total3m        = rows.reduce((s, r) => s + r.threesMade, 0);

  const stats = {
    gamesPlayed,
    totalPoints,
    totalRebounds,
    totalAssists,
    totalThreesMade: total3m,
    avgPoints:    gamesPlayed ? round1(totalPoints   / gamesPlayed) : 0,
    avgRebounds:  gamesPlayed ? round1(totalRebounds / gamesPlayed) : 0,
    avgAssists:   gamesPlayed ? round1(totalAssists  / gamesPlayed) : 0,
    avgThreesMade: gamesPlayed ? round1(total3m      / gamesPlayed) : 0,
  };

  // Find the athlete's user profile for stamps / tides / archetype
  const [athleteProfile] = await db
    .select({
      stamps:    userProfilesTable.stamps,
      tides:     userProfilesTable.tides,
      archetype: userProfilesTable.archetype,
      avatarUrl: userProfilesTable.avatarUrl,
      school:    userProfilesTable.school,
    })
    .from(userProfilesTable)
    .where(
      and(
        eq(userProfilesTable.firstName, player.firstName),
        eq(userProfilesTable.lastName,  player.lastName),
      )
    );

  res.json({
    player: {
      id:        player.id,
      firstName: player.firstName,
      lastName:  player.lastName,
      number:    player.number,
      teamId:    player.teamId,
    },
    stats,
    profile: athleteProfile ?? null,
  });
});

router.get("/profiles/:clerkUserId", async (req, res): Promise<void> => {
  const { clerkUserId } = req.params;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(GetProfileResponse.parse(serializeRow(profile)));
});

// Admin-only: override teamId and verified status for any profile
router.put("/profiles/:clerkUserId", async (req, res): Promise<void> => {
  const requesterId = requireAuth(req, res);
  if (!requesterId) return;

  const [requesterProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, requesterId));

  if (!requesterProfile?.isAdmin) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return;
  }

  const { clerkUserId } = req.params;

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Capture old state so we can remove stale roster entries
  const [oldProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  const [profile] = await db
    .update(userProfilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // Sync roster: removes old team entry, adds new one (or removes entirely if no team)
  await syncPlayerForTeamChange(
    oldProfile?.firstName ?? null,
    oldProfile?.lastName ?? null,
    oldProfile?.teamId ?? undefined,
    profile.firstName,
    profile.lastName,
    profile.teamId ?? undefined,
    profile.number ?? null,
  );

  res.json(GetProfileResponse.parse(serializeRow(profile)));
});

// Admin-only: permanently delete a player profile
router.delete("/profiles/:clerkUserId", async (req, res): Promise<void> => {
  const requesterId = requireAuth(req, res);
  if (!requesterId) return;

  const [requesterProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, requesterId));

  if (!requesterProfile?.isAdmin) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return;
  }

  const { clerkUserId } = req.params;

  // Prevent deletion of protected admin accounts — admin role is tied to
  // the Clerk account, not the profile, so deleting it would strip privileges.
  const targetIsProtected = await isProtectedAdmin(clerkUserId);
  if (targetIsProtected) {
    res.status(403).json({ error: "Cannot delete a protected admin account." });
    return;
  }

  // Also prevent any admin from deleting their own profile
  if (clerkUserId === requesterId) {
    res.status(403).json({ error: "Admins cannot delete their own profile." });
    return;
  }

  const [deleted] = await db
    .delete(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // Remove the matching player entry (and cascade-delete all their game stats).
  // Match on name + team — the same key used by syncPlayerEntry — so we remove
  // exactly the players row that was auto-created for this profile.
  // If teamId is null the player was never assigned a team and no player row exists.
  if (deleted.teamId) {
    await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.firstName, deleted.firstName),
          eq(playersTable.lastName, deleted.lastName),
          eq(playersTable.teamId, deleted.teamId)
        )
      );
  } else {
    // No team: still try to clean up any orphan player rows with this name
    // that have a null teamId (edge case where player was synced without a team).
    await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.firstName, deleted.firstName),
          eq(playersTable.lastName, deleted.lastName),
          isNull(playersTable.teamId)
        )
      );
  }

  res.status(204).send();
});

export default router;
