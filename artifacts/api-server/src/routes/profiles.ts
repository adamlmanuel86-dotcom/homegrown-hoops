import { Router, type IRouter } from "express";
import { eq, count, and, isNull, ne } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import crypto from "crypto";
import { db, userProfilesTable, playersTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { isProtectedAdmin } from "../lib/adminGuard";

/** Parse CLOUDINARY_URL (cloudinary://key:secret@cloud_name) into its components. */
function parseCloudinaryUrl(): { apiKey: string; apiSecret: string; cloudName: string } | null {
  const raw = process.env.CLOUDINARY_URL;
  if (!raw) return null;
  try {
    const parsed = new URL(raw.replace(/^cloudinary:\/\//, "https://"));
    return {
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
      cloudName: parsed.hostname,
    };
  } catch {
    return null;
  }
}

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

  const role = shouldBeAdmin ? "admin" : "player";

  const [profile] = await db
    .insert(userProfilesTable)
    .values({ ...parsed.data, clerkUserId: userId, isAdmin: shouldBeAdmin, role })
    .returning();

  await syncPlayerForTeamChange(null, null, null, profile.firstName, profile.lastName, profile.teamId ?? undefined, profile.number ?? null);

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

// Admin-only: upload an image to Cloudinary and set it as the player's avatar.
// Accepts JSON body: { dataUri: string }  (base64 data URI, e.g. "data:image/jpeg;base64,...")
// Parses CLOUDINARY_URL server-side so credentials never leave the server.
router.post("/profiles/:clerkUserId/avatar/upload", async (req, res): Promise<void> => {
  // ── Auth diagnostic — always logged so Railway shows exactly what arrived ──
  const rawAuth = req.headers.authorization ?? "";
  const clerkSecret = process.env.CLERK_SECRET_KEY ?? "";
  req.log.info(
    {
      hasAuthorizationHeader: !!rawAuth,
      authorizationPrefix: rawAuth ? rawAuth.substring(0, 20) + "…" : "(none)",
      CLERK_SECRET_KEY_set: !!clerkSecret,
      CLERK_SECRET_KEY_prefix: clerkSecret ? clerkSecret.substring(0, 12) : "(not set)",
      contentType: req.headers["content-type"] ?? "(none)",
      targetClerkUserId: req.params.clerkUserId,
    },
    "avatar/upload: incoming request diagnostic"
  );

  const { userId: requesterId } = getAuth(req);
  req.log.info({ requesterId: requesterId ?? "(null)" }, "avatar/upload: getAuth result");

  if (!requesterId) {
    res.status(401).json({
      error: "Unauthorized",
      diag: {
        hasAuthorizationHeader: !!rawAuth,
        CLERK_SECRET_KEY_prefix: clerkSecret ? clerkSecret.substring(0, 12) : "(not set)",
        hint: !rawAuth
          ? "No Authorization header received — getToken() may have returned null on the client."
          : "Authorization header present but Clerk rejected the token — possible key mismatch or expired token.",
      },
    });
    return;
  }
  // ── End diagnostic ─────────────────────────────────────────────────────────

  const [requesterProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, requesterId));

  if (!requesterProfile?.isAdmin) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return;
  }

  const creds = parseCloudinaryUrl();
  if (!creds) {
    req.log.error(
      { CLOUDINARY_URL_set: !!process.env.CLOUDINARY_URL },
      "avatar/upload: Cloudinary not configured — CLOUDINARY_URL env var is missing or invalid",
    );
    res.status(500).json({ error: "Cloudinary not configured — CLOUDINARY_URL env var is missing or invalid" });
    return;
  }
  req.log.info({ cloudName: creds.cloudName }, "avatar/upload: Cloudinary creds parsed OK");

  const { dataUri } = req.body as { dataUri?: string };
  if (!dataUri || !dataUri.startsWith("data:")) {
    res.status(400).json({ error: "dataUri is required (must be a base64 data URI)" });
    return;
  }

  const { apiKey, apiSecret, cloudName } = creds;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "homegrown-hoops/profiles";
  const paramStr = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(paramStr + apiSecret).digest("hex");

  const fd = new FormData();
  fd.append("file", dataUri);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", folder);

  const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });

  if (!upRes.ok) {
    const text = await upRes.text();
    req.log.error({ status: upRes.status, body: text }, "avatar/upload: Cloudinary rejected upload");
    res.status(502).json({ error: `Cloudinary upload failed (${upRes.status}): ${text}` });
    return;
  }

  const data = await upRes.json() as { secure_url?: string };
  const avatarUrl = data.secure_url;
  if (!avatarUrl) {
    res.status(502).json({ error: "Cloudinary returned no URL" });
    return;
  }

  const { clerkUserId } = req.params;
  const [profile] = await db
    .update(userProfilesTable)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({ avatarUrl });
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
