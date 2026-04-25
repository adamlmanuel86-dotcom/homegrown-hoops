import { Router, type IRouter } from "express";
import { eq, and, ne, isNull, or, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable, playersTable, gamesTable, gamePlayerStatsTable, teamsTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { isProtectedAdmin } from "../lib/adminGuard";
import { recalculateTides, previewTeamTides, applyTeamTides, resetTeamSeason, getTeamCurrentSeason } from "../recognition";
import type { TideEntry, ArchetypeHistoryEntry } from "@workspace/db";

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

// ─── Team end-of-season: preview (dry-run, no saves) ─────────────────────────
// GET /admin/teams/:teamId/season-tides/preview?season=X
router.get("/admin/teams/:teamId/season-tides/preview", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const season = req.query.season as string | undefined;
  const result = await previewTeamTides(teamId, season);
  res.json(result);
});

// ─── Team end-of-season: apply tides ─────────────────────────────────────────
// POST /admin/teams/:teamId/season-tides   body: { season?: string }
router.post("/admin/teams/:teamId/season-tides", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const { season } = req.body as { season?: string };
  const result = await applyTeamTides(teamId, season);
  res.json({ success: true, ...result });
});

// ─── Team new-season reset ────────────────────────────────────────────────────
// POST /admin/teams/:teamId/new-season-reset   body: { season?: string }
router.post("/admin/teams/:teamId/new-season-reset", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const { season, newSeasonName } = req.body as { season?: string; newSeasonName?: string };
  const result = await resetTeamSeason(teamId, newSeasonName, season);
  res.json({ success: true, ...result });
});

// ─── Team season history ──────────────────────────────────────────────────────
// GET /admin/teams/:teamId/seasons
// Returns all distinct seasons for the team, sorted newest first. Marks which
// is the current active season. Archived = all seasons except the current one.
router.get("/admin/teams/:teamId/seasons", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));

  const rows = await db
    .select({ season: gamesTable.season })
    .from(gamesTable)
    .where(or(eq(gamesTable.homeTeamId, teamId), eq(gamesTable.awayTeamId, teamId)));

  const gameSeasons = [...new Set(rows.map((r) => r.season))];

  // The explicitly stored currentSeason (set during Start New Season) is the
  // authoritative active season. Fall back to the most recent game season.
  const currentSeason = team?.currentSeason ?? gameSeasons.sort((a, b) => b.localeCompare(a))[0] ?? null;

  // Include the new active season in the list even if no games exist yet
  const allSet = new Set(gameSeasons);
  if (currentSeason) allSet.add(currentSeason);
  const all = [...allSet].sort((a, b) => b.localeCompare(a));

  res.json({ seasons: all, currentSeason });
});

// ─── Delete an archived season ────────────────────────────────────────────────
// DELETE /admin/teams/:teamId/seasons/:season
// Permanently removes all data for that season: games (+ stats via cascade),
// tides tagged with that season, and archetypeHistory entries for that season.
// Refuses to delete the current active season.
router.delete("/admin/teams/:teamId/seasons/:season", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const teamId = parseInt(req.params.teamId);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const { season } = req.params;
  const currentSeason = await getTeamCurrentSeason(teamId);
  if (season === currentSeason) {
    res.status(400).json({ error: "Cannot delete the current active season." });
    return;
  }

  // Find all game IDs for this team in this season
  const gameRows = await db
    .select({ id: gamesTable.id })
    .from(gamesTable)
    .where(
      and(
        eq(gamesTable.season, season),
        or(eq(gamesTable.homeTeamId, teamId), eq(gamesTable.awayTeamId, teamId))
      )
    );
  const gameIds = gameRows.map((g) => g.id);

  // Delete game_player_stats (explicit delete before games, cascade covers it too)
  if (gameIds.length > 0) {
    await db.delete(gamePlayerStatsTable).where(inArray(gamePlayerStatsTable.gameId, gameIds));
    await db.delete(gamesTable).where(inArray(gamesTable.id, gameIds));
  }

  // Remove season tides and archetypeHistory from all team player profiles
  const teamProfiles = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.teamId, teamId));

  for (const profile of teamProfiles) {
    const filteredTides = ((profile.tides ?? []) as TideEntry[])
      .filter((t) => t.season !== season);
    const filteredHistory = ((profile.archetypeHistory ?? []) as ArchetypeHistoryEntry[])
      .filter((h) => h.season !== season);

    await db
      .update(userProfilesTable)
      .set({
        tides:            filteredTides,
        archetypeHistory: filteredHistory,
        updatedAt:        new Date(),
      })
      .where(eq(userProfilesTable.id, profile.id));
  }

  res.json({ success: true, season, gamesDeleted: gameIds.length });
});

// ─── One-time / on-demand roster cleanup ─────────────────────────────────────
// POST /admin/sync-all-players
// For every profile: removes player rows that don't match the profile's current
// teamId, and ensures the correct row exists. Safe to call repeatedly.
router.post("/admin/sync-all-players", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const profiles = await db.select().from(userProfilesTable);
  let removed = 0;
  let upserted = 0;

  for (const profile of profiles) {
    const { firstName, lastName, teamId } = profile;
    if (!firstName || !lastName) continue;

    if (teamId) {
      // Delete any rows for this name on a DIFFERENT team
      const del = await db
        .delete(playersTable)
        .where(
          and(
            eq(playersTable.firstName, firstName),
            eq(playersTable.lastName, lastName),
            ne(playersTable.teamId, teamId)
          )
        )
        .returning({ id: playersTable.id });
      removed += del.length;

      // Also remove null-team orphans for this name
      const delNull = await db
        .delete(playersTable)
        .where(
          and(
            eq(playersTable.firstName, firstName),
            eq(playersTable.lastName, lastName),
            isNull(playersTable.teamId)
          )
        )
        .returning({ id: playersTable.id });
      removed += delNull.length;

      // Ensure correct row exists
      const [existing] = await db
        .select({ id: playersTable.id })
        .from(playersTable)
        .where(
          and(
            eq(playersTable.firstName, firstName),
            eq(playersTable.lastName, lastName),
            eq(playersTable.teamId, teamId)
          )
        );
      if (!existing) {
        await db.insert(playersTable).values({
          firstName,
          lastName,
          teamId,
          number: profile.number ?? null,
        });
        upserted++;
      }
    } else {
      // Profile has no team — remove all player rows for this name
      const del = await db
        .delete(playersTable)
        .where(
          and(
            eq(playersTable.firstName, firstName),
            eq(playersTable.lastName, lastName)
          )
        )
        .returning({ id: playersTable.id });
      removed += del.length;
    }
  }

  res.json({ success: true, removed, upserted });
});

export default router;
