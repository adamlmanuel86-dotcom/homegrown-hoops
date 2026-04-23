import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { isProtectedAdmin } from "../lib/adminGuard";
import { recalculateTides } from "../recognition";

const router: IRouter = Router();

async function requireAdmin(
  req: Parameters<Parameters<typeof router.use>[0]>[0],
  res: Parameters<Parameters<typeof router.use>[0]>[1]
): Promise<string | null> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return userId;
}

router.get("/admin/users", async (req, res): Promise<void> => {
  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const users = await db
    .select({
      id: userProfilesTable.id,
      clerkUserId: userProfilesTable.clerkUserId,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      role: userProfilesTable.role,
      isAdmin: userProfilesTable.isAdmin,
      createdAt: userProfilesTable.createdAt,
    })
    .from(userProfilesTable)
    .orderBy(userProfilesTable.createdAt);

  res.json(serializeRows(users));
});

const VALID_ROLES = ["admin", "coach", "player"] as const;
type ValidRole = typeof VALID_ROLES[number];

router.patch("/admin/users/:clerkUserId/role", async (req, res): Promise<void> => {
  const requesterId = await requireAdmin(req, res);
  if (!requesterId) return;

  const { clerkUserId } = req.params;
  const { role } = req.body as { role: unknown };

  if (!role || !VALID_ROLES.includes(role as ValidRole)) {
    res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(", ")}` });
    return;
  }

  // The protected admin account's role can never be changed
  const targetIsProtected = await isProtectedAdmin(clerkUserId);
  if (targetIsProtected) {
    res.status(403).json({ error: "The primary admin account role cannot be changed." });
    return;
  }

  const isAdmin = role === "admin";

  const [updated] = await db
    .update(userProfilesTable)
    .set({ role: role as ValidRole, isAdmin, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .returning({
      id: userProfilesTable.id,
      clerkUserId: userProfilesTable.clerkUserId,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      role: userProfilesTable.role,
      isAdmin: userProfilesTable.isAdmin,
      createdAt: userProfilesTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(serializeRow(updated));
});

// ─── Season-end Tides: calculate and award automatically ─────────────────────
// POST /admin/season-tides/:season
// Runs the full automatic tide calculation for the given season and writes
// results to profiles. Should only be triggered by admin at season end.
router.post("/admin/season-tides/:season", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { season } = req.params;
  if (!season) {
    res.status(400).json({ error: "Season is required" });
    return;
  }

  await recalculateTides(season);
  res.json({ success: true, message: `Tides calculated for season ${season}` });
});

// ─── Manual Tide Award ────────────────────────────────────────────────────────
// POST /admin/profiles/:profileId/tides
// Body: { tideId: string }
// Manually awards a specific tide to a player (override for exceptional circumstances).
router.post("/admin/profiles/:profileId/tides", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const profileId = parseInt(req.params.profileId);
  if (isNaN(profileId)) {
    res.status(400).json({ error: "Invalid profile id" });
    return;
  }

  const { tideId } = req.body as { tideId?: string };
  if (!tideId || typeof tideId !== "string") {
    res.status(400).json({ error: "tideId is required" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, profileId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const existing = (profile.tides ?? []) as { id: string; earnedAt: string }[];

  // Don't duplicate
  if (existing.some((t) => t.id === tideId)) {
    res.status(409).json({ error: "This tide is already awarded to this player" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const newTides = [...existing, { id: tideId, earnedAt: today }];

  const [updated] = await db
    .update(userProfilesTable)
    .set({ tides: newTides, updatedAt: new Date() })
    .where(eq(userProfilesTable.id, profileId))
    .returning();

  res.json(serializeRow({ ...updated, tides: newTides }));
});

// ─── Manual Tide Removal ──────────────────────────────────────────────────────
// DELETE /admin/profiles/:profileId/tides/:tideId
// Removes a specific tide from a player (override).
router.delete("/admin/profiles/:profileId/tides/:tideId", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const profileId = parseInt(req.params.profileId);
  if (isNaN(profileId)) {
    res.status(400).json({ error: "Invalid profile id" });
    return;
  }

  const { tideId } = req.params;

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, profileId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const existing = (profile.tides ?? []) as { id: string; earnedAt: string }[];
  const newTides = existing.filter((t) => t.id !== tideId);

  if (newTides.length === existing.length) {
    res.status(404).json({ error: "Tide not found on this profile" });
    return;
  }

  const [updated] = await db
    .update(userProfilesTable)
    .set({ tides: newTides, updatedAt: new Date() })
    .where(eq(userProfilesTable.id, profileId))
    .returning();

  res.json(serializeRow({ ...updated, tides: newTides }));
});

// ─── Get profiles with their tides (for admin tide management view) ───────────
router.get("/admin/profiles-tides", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const profiles = await db
    .select({
      id: userProfilesTable.id,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      tides: userProfilesTable.tides,
      archetype: userProfilesTable.archetype,
    })
    .from(userProfilesTable)
    .orderBy(userProfilesTable.firstName);

  res.json(serializeRows(profiles));
});

export default router;
