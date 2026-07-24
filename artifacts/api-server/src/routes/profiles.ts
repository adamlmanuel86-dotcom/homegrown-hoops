import { Router, type IRouter } from "express";
import { eq, count, and, isNull, ne, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable, playersTable, teamsTable, arcadeSessionsTable, isoBallSessionsTable, isoBallDailyQuestionsTable, gamePlayerStatsTable, gamesTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { isProtectedAdmin } from "../lib/adminGuard";

// Max base64 data URI size accepted for profile photos (≈ 600 KB decoded).
// The frontend compresses to ≤500 KB before sending, so this is a safety cap.
const MAX_DATA_URI_BYTES = 800_000;

/**
 * Multi-team roster sync when a profile is created or updated.
 * - Removes player rows for any teams that were removed from teamIds.
 * - If the player's name changed, removes old-name rows on all new teams.
 * - Upserts one player row per team in newTeamIds so the player appears on all rosters.
 */
export async function syncPlayersForTeams(
  oldFirstName: string | null,
  oldLastName: string | null,
  oldTeamIds: number[],
  newFirstName: string,
  newLastName: string,
  newTeamIds: number[],
  number?: string | null,
) {
  // 1. Teams that were removed — delete their player rows
  const removedTeamIds = oldTeamIds.filter((id) => !newTeamIds.includes(id));
  if (oldFirstName && oldLastName && removedTeamIds.length > 0) {
    await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.firstName, oldFirstName),
          eq(playersTable.lastName, oldLastName),
          inArray(playersTable.teamId, removedTeamIds)
        )
      );
  }

  // 2. If the name changed, remove old-name rows on all new teams too
  if (
    oldFirstName && oldLastName &&
    (oldFirstName !== newFirstName || oldLastName !== newLastName) &&
    newTeamIds.length > 0
  ) {
    await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.firstName, oldFirstName),
          eq(playersTable.lastName, oldLastName),
          inArray(playersTable.teamId, newTeamIds)
        )
      );
  }

  // 3. Nothing more to do if no teams selected
  if (newTeamIds.length === 0 || !newFirstName || !newLastName) return;

  // 4. Upsert one player row per team in newTeamIds
  for (const teamId of newTeamIds) {
    const [existing] = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(
        and(
          eq(playersTable.firstName, newFirstName),
          eq(playersTable.lastName, newLastName),
          eq(playersTable.teamId, teamId)
        )
      );

    if (existing) {
      if (number !== undefined) {
        await db.update(playersTable)
          .set({ number: number ?? null })
          .where(eq(playersTable.id, existing.id));
      }
    } else {
      await db.insert(playersTable).values({
        firstName: newFirstName,
        lastName: newLastName,
        teamId,
        number: number ?? null,
      });
    }
  }
}

/** Backward-compatible single-team wrapper around syncPlayersForTeams. */
export async function syncPlayerForTeamChange(
  oldFirstName: string | null,
  oldLastName: string | null,
  oldTeamId: number | null | undefined,
  newFirstName: string,
  newLastName: string,
  newTeamId: number | null | undefined,
  number?: string | null,
) {
  await syncPlayersForTeams(
    oldFirstName,
    oldLastName,
    oldTeamId ? [oldTeamId] : [],
    newFirstName,
    newLastName,
    newTeamId ? [newTeamId] : [],
    number,
  );
}

/** Returns a zeroed-out stats object for when no game data exists. */
function emptyAggregateStats() {
  return {
    gamesPlayed: 0, wins: 0,
    totalPoints: 0, totalRebounds: 0, totalAssists: 0,
    totalSteals: 0, totalBlocks: 0, totalTurnovers: 0,
    totalThreesMade: 0, totalThreesAttempted: 0,
    totalFieldGoalsMade: 0, totalFieldGoalsAttempted: 0,
    totalFreeThrowsMade: 0, totalFreeThrowsAttempted: 0,
    avgPoints: 0, avgRebounds: 0, avgAssists: 0, avgThreesMade: 0,
    avgSteals: 0, avgBlocks: 0, avgTurnovers: 0, avgMinutes: 0,
    fieldGoalPct: 0, threePointPct: 0, freeThrowPct: 0,
  };
}

import {
  CreateMyProfileBody,
  UpdateMyProfileBody,
  UpdateProfileBody,
  GetMyProfileResponse,
  GetProfileResponse,
  UpdateMyBallersBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profiles", async (_req, res): Promise<void> => {
  const profiles = await db
    .select()
    .from(userProfilesTable)
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

  // Extract requestedRole before spreading into DB insert
  const { requestedRole: reqRole, ...profileData } = parsed.data as typeof parsed.data & { requestedRole?: string | null };
  // Only managers need admin approval; parents get immediate access
  const isPending = !shouldBeAdmin && reqRole === "manager";
  const role = shouldBeAdmin ? "admin" : (reqRole === "parent" ? "parent" : "player");

  const [profile] = await db
    .insert(userProfilesTable)
    .values({
      ...profileData,
      clerkUserId: userId,
      isAdmin: shouldBeAdmin,
      role,
      isPending,
      requestedRole: isPending ? (reqRole ?? null) : null,
    })
    .returning();

  // Skip roster entry for pending accounts — they're not active players yet
  if (!isPending) {
    const profileTeamIds = (profile.teamIds as number[] | null) ?? [];
    const effectiveNewTeamIds = profileTeamIds.length > 0
      ? profileTeamIds
      : (profile.teamId ? [profile.teamId] : []);
    await syncPlayersForTeams(null, null, [], profile.firstName, profile.lastName, effectiveNewTeamIds, profile.number ?? null);
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

  // Normalize teamId/teamIds: if teamIds is provided, derive teamId from it
  const incomingTeamIds = (parsed.data as typeof parsed.data & { teamIds?: number[] }).teamIds;
  const effectiveTeamIds = incomingTeamIds !== undefined
    ? incomingTeamIds
    : ((oldProfile?.teamIds as number[] | null) ?? []);
  const primaryTeamId = effectiveTeamIds[0] ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile] = await db
    .update(userProfilesTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ ...(parsed.data as any), teamIds: effectiveTeamIds, teamId: primaryTeamId, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, userId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // Skip roster sync for parents
  if (profile.role !== "parent") {
    const oldTeamIds = (oldProfile?.teamIds as number[] | null) ?? (oldProfile?.teamId ? [oldProfile.teamId] : []);
    await syncPlayersForTeams(
      oldProfile?.firstName ?? null,
      oldProfile?.lastName ?? null,
      oldTeamIds,
      profile.firstName,
      profile.lastName,
      effectiveTeamIds,
      profile.number ?? null,
    );
  }

  res.json(GetMyProfileResponse.parse(serializeRow(profile)));
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

  // Sync roster: admin sets a single teamId, keep teamIds in sync with it
  const adminOldTeamIds = (oldProfile?.teamIds as number[] | null) ?? (oldProfile?.teamId ? [oldProfile.teamId] : []);
  const adminNewTeamIds = profile.teamId ? [profile.teamId] : [];
  await syncPlayersForTeams(
    oldProfile?.firstName ?? null,
    oldProfile?.lastName ?? null,
    adminOldTeamIds,
    profile.firstName,
    profile.lastName,
    adminNewTeamIds,
    profile.number ?? null,
  );

  // Persist the updated teamIds to match the new teamId
  await db
    .update(userProfilesTable)
    .set({ teamIds: adminNewTeamIds })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  res.json(GetProfileResponse.parse(serializeRow(profile)));
});

// Admin-only: accept a compressed base64 data URI and store it directly in
// avatarUrl — no external storage dependency.
// Accepts JSON body: { dataUri: string }  (e.g. "data:image/jpeg;base64,...")
// The frontend compresses to ≤500 KB before sending; the server enforces an
// 800 KB hard cap to prevent oversized payloads reaching the database.
router.post("/profiles/:clerkUserId/avatar/upload", async (req, res): Promise<void> => {
  const { userId: requesterId } = getAuth(req);
  if (!requesterId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [requesterProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, requesterId));

  if (!requesterProfile?.isAdmin) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return;
  }

  const { dataUri } = req.body as { dataUri?: string };
  if (!dataUri || !dataUri.startsWith("data:image/")) {
    res.status(400).json({ error: "dataUri is required and must be an image data URI (data:image/...)" });
    return;
  }

  if (dataUri.length > MAX_DATA_URI_BYTES) {
    res.status(413).json({
      error: `Image too large (${Math.round(dataUri.length / 1024)} KB). Please compress to under 600 KB before uploading.`,
    });
    return;
  }

  const { clerkUserId } = req.params;
  const [profile] = await db
    .update(userProfilesTable)
    .set({ avatarUrl: dataUri, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  req.log.info({ clerkUserId, dataUriLength: dataUri.length }, "avatar/upload: saved base64 data URI to DB");
  res.json({ avatarUrl: dataUri });
});

// Admin-only: update avatar (upload or clear) for any profile
router.patch("/profiles/:clerkUserId/avatar", async (req, res): Promise<void> => {
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
  const body = req.body as { avatarUrl?: string | null };
  // Accept explicit null (clear) or a string URL (set)
  const newAvatarUrl = body.avatarUrl === undefined ? undefined : (body.avatarUrl ?? null);

  if (newAvatarUrl === undefined) {
    res.status(400).json({ error: "avatarUrl is required (pass null to clear)" });
    return;
  }

  const [profile] = await db
    .update(userProfilesTable)
    .set({ avatarUrl: newAvatarUrl, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({ avatarUrl: profile.avatarUrl });
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

  // Prevent any admin from deleting their own profile
  if (clerkUserId === requesterId) {
    res.status(403).json({ error: "Admins cannot delete their own profile." });
    return;
  }

  // Prevent deletion of other admin accounts (protected-admin guard)
  const [targetProfile] = await db
    .select({ isAdmin: userProfilesTable.isAdmin, role: userProfilesTable.role })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  if (targetProfile?.isAdmin || targetProfile?.role === "admin") {
    res.status(403).json({ error: "Admin accounts cannot be deleted." });
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

  // Remove all player rows for this profile across all teams.
  const deletedTeamIds = (deleted.teamIds as number[] | null) ?? (deleted.teamId ? [deleted.teamId] : []);
  if (deletedTeamIds.length > 0) {
    await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.firstName, deleted.firstName),
          eq(playersTable.lastName, deleted.lastName),
          inArray(playersTable.teamId, deletedTeamIds)
        )
      );
  } else {
    // No team assigned: clean up any orphan null-team rows (edge case)
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

  // Remove all arcade and Iso Ball data for this account
  await Promise.all([
    db.delete(arcadeSessionsTable).where(eq(arcadeSessionsTable.clerkUserId, clerkUserId)),
    db.delete(isoBallSessionsTable).where(eq(isoBallSessionsTable.clerkUserId, clerkUserId)),
    db.delete(isoBallDailyQuestionsTable).where(eq(isoBallDailyQuestionsTable.clerkUserId, clerkUserId)),
  ]);

  res.status(204).send();
});

// GET /profiles/:clerkUserId/aggregate-stats — career stats across all teams
router.get("/profiles/:clerkUserId/aggregate-stats", async (req, res): Promise<void> => {
  const { clerkUserId } = req.params;

  const [profile] = await db
    .select({
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      teamId: userProfilesTable.teamId,
      teamIds: userProfilesTable.teamIds,
    })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // Effective teamIds: prefer teamIds array, fall back to teamId for legacy profiles
  const rawTeamIds = (profile.teamIds as number[] | null) ?? [];
  const effectiveTeamIds = rawTeamIds.length > 0
    ? rawTeamIds
    : (profile.teamId ? [profile.teamId] : []);

  if (!profile.firstName || !profile.lastName || effectiveTeamIds.length === 0) {
    res.json(emptyAggregateStats());
    return;
  }

  // Find all player rows matching this profile's name across all their teams
  const playerRows = await db
    .select({ id: playersTable.id, teamId: playersTable.teamId })
    .from(playersTable)
    .where(
      and(
        eq(playersTable.firstName, profile.firstName),
        eq(playersTable.lastName, profile.lastName),
        inArray(playersTable.teamId, effectiveTeamIds)
      )
    );

  const playerIds = playerRows.map((p) => p.id);
  if (playerIds.length === 0) {
    res.json(emptyAggregateStats());
    return;
  }

  // Fetch all game stats for all player IDs joined with game data for win calc
  const rows = await db
    .select({
      playerId:              gamePlayerStatsTable.playerId,
      points:               gamePlayerStatsTable.points,
      rebounds:             gamePlayerStatsTable.rebounds,
      assists:              gamePlayerStatsTable.assists,
      steals:               gamePlayerStatsTable.steals,
      blocks:               gamePlayerStatsTable.blocks,
      turnovers:            gamePlayerStatsTable.turnovers,
      threesMade:           gamePlayerStatsTable.threesMade,
      threesAttempted:      gamePlayerStatsTable.threesAttempted,
      fieldGoalsMade:       gamePlayerStatsTable.fieldGoalsMade,
      fieldGoalsAttempted:  gamePlayerStatsTable.fieldGoalsAttempted,
      freeThrowsMade:       gamePlayerStatsTable.freeThrowsMade,
      freeThrowsAttempted:  gamePlayerStatsTable.freeThrowsAttempted,
      minutes:              gamePlayerStatsTable.minutesPlayed,
      homeTeamId:           gamesTable.homeTeamId,
      awayTeamId:           gamesTable.awayTeamId,
      homeScore:            gamesTable.homeScore,
      awayScore:            gamesTable.awayScore,
    })
    .from(gamePlayerStatsTable)
    .innerJoin(gamesTable, eq(gamePlayerStatsTable.gameId, gamesTable.id))
    .where(inArray(gamePlayerStatsTable.playerId, playerIds));

  if (rows.length === 0) {
    res.json(emptyAggregateStats());
    return;
  }

  // Build a playerId → teamId map for win calculation
  const playerTeamMap = new Map<number, number | null>();
  for (const p of playerRows) playerTeamMap.set(p.id, p.teamId);

  let gamesPlayed = 0, wins = 0;
  let totalPoints = 0, totalRebounds = 0, totalAssists = 0;
  let totalSteals = 0, totalBlocks = 0, totalTurnovers = 0;
  let totalThreesMade = 0, totalThreesAttempted = 0;
  let totalFieldGoalsMade = 0, totalFieldGoalsAttempted = 0;
  let totalFreeThrowsMade = 0, totalFreeThrowsAttempted = 0;
  let totalMinutes = 0;

  for (const row of rows) {
    gamesPlayed++;
    totalPoints    += row.points    ?? 0;
    totalRebounds  += row.rebounds  ?? 0;
    totalAssists   += row.assists   ?? 0;
    totalSteals    += row.steals    ?? 0;
    totalBlocks    += row.blocks    ?? 0;
    totalTurnovers += row.turnovers ?? 0;
    totalThreesMade          += row.threesMade          ?? 0;
    totalThreesAttempted     += row.threesAttempted     ?? 0;
    totalFieldGoalsMade      += row.fieldGoalsMade      ?? 0;
    totalFieldGoalsAttempted += row.fieldGoalsAttempted ?? 0;
    totalFreeThrowsMade      += row.freeThrowsMade      ?? 0;
    totalFreeThrowsAttempted += row.freeThrowsAttempted ?? 0;
    totalMinutes += row.minutes ?? 0;

    // Count a win if the player's team won this game
    const teamId = playerTeamMap.get(row.playerId);
    if (teamId != null && row.homeScore != null && row.awayScore != null) {
      if (row.homeTeamId === teamId && row.homeScore > row.awayScore) wins++;
      else if (row.awayTeamId === teamId && row.awayScore > row.homeScore) wins++;
    }
  }

  const fgPct = totalFieldGoalsAttempted > 0 ? totalFieldGoalsMade / totalFieldGoalsAttempted : 0;
  const tpPct = totalThreesAttempted     > 0 ? totalThreesMade     / totalThreesAttempted     : 0;
  const ftPct = totalFreeThrowsAttempted > 0 ? totalFreeThrowsMade / totalFreeThrowsAttempted : 0;

  res.json({
    gamesPlayed,
    wins,
    totalPoints,    totalRebounds,    totalAssists,
    totalSteals,    totalBlocks,      totalTurnovers,
    totalThreesMade, totalThreesAttempted,
    totalFieldGoalsMade, totalFieldGoalsAttempted,
    totalFreeThrowsMade, totalFreeThrowsAttempted,
    avgPoints:     gamesPlayed > 0 ? totalPoints    / gamesPlayed : 0,
    avgRebounds:   gamesPlayed > 0 ? totalRebounds  / gamesPlayed : 0,
    avgAssists:    gamesPlayed > 0 ? totalAssists   / gamesPlayed : 0,
    avgThreesMade: gamesPlayed > 0 ? totalThreesMade / gamesPlayed : 0,
    avgSteals:     gamesPlayed > 0 ? totalSteals    / gamesPlayed : 0,
    avgBlocks:     gamesPlayed > 0 ? totalBlocks    / gamesPlayed : 0,
    avgTurnovers:  gamesPlayed > 0 ? totalTurnovers / gamesPlayed : 0,
    avgMinutes:    gamesPlayed > 0 ? totalMinutes   / gamesPlayed : 0,
    fieldGoalPct:  fgPct,
    threePointPct: tpPct,
    freeThrowPct:  ftPct,
  });
});

// PUT /profiles/me/ballers — replace the current user's My Ballers list
router.put("/profiles/me/ballers", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdateMyBallersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(userProfilesTable)
    .set({ myBallers: parsed.data.playerIds, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(GetMyProfileResponse.parse(serializeRow(updated)));
});

// GET /profiles/:clerkUserId/ballers — get My Ballers player details for a profile
router.get("/profiles/:clerkUserId/ballers", async (req, res): Promise<void> => {
  const { clerkUserId } = req.params;

  const [profile] = await db
    .select({ myBallers: userProfilesTable.myBallers })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const ids = profile.myBallers ?? [];
  if (ids.length === 0) {
    res.json([]);
    return;
  }

  const players = await db
    .select({
      id: playersTable.id,
      firstName: playersTable.firstName,
      lastName: playersTable.lastName,
      position: playersTable.position,
      number: playersTable.number,
      avatarUrl: playersTable.avatarUrl,
      teamId: playersTable.teamId,
      teamName: teamsTable.name,
    })
    .from(playersTable)
    .leftJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .where(inArray(playersTable.id, ids));

  res.json(serializeRows(players));
});

// PATCH /profiles/me/avatar-config — save the current user's avatar config
router.patch("/profiles/me/avatar-config", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { avatarConfig } = req.body as { avatarConfig: unknown };
  if (!avatarConfig || typeof avatarConfig !== "object") {
    return res.status(400).json({ error: "avatarConfig is required" });
  }

  const [updated] = await db
    .update(userProfilesTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set({ avatarConfig: avatarConfig as any })
    .where(eq(userProfilesTable.clerkUserId, userId))
    .returning();

  if (!updated) return res.status(404).json({ error: "Profile not found" });

  return res.json(serializeRow(updated));
});

export default router;
