import { Router, type IRouter } from "express";
import { eq, count, and, isNull, ne, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable, playersTable, teamsTable, arcadeSessionsTable, isoBallSessionsTable, isoBallDailyQuestionsTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { isProtectedAdmin } from "../lib/adminGuard";

// Max base64 data URI size accepted for profile photos (≈ 600 KB decoded).
// The frontend compresses to ≤500 KB before sending, so this is a safety cap.
const MAX_DATA_URI_BYTES = 800_000;

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

  // Remove all arcade and Iso Ball data for this account
  await Promise.all([
    db.delete(arcadeSessionsTable).where(eq(arcadeSessionsTable.clerkUserId, clerkUserId)),
    db.delete(isoBallSessionsTable).where(eq(isoBallSessionsTable.clerkUserId, clerkUserId)),
    db.delete(isoBallDailyQuestionsTable).where(eq(isoBallDailyQuestionsTable.clerkUserId, clerkUserId)),
  ]);

  res.status(204).send();
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
