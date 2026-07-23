import { Router, type IRouter } from "express";
import { eq, sum, count } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, jerseyStubsTable, teamsTable, gamePlayerStatsTable, userProfilesTable } from "@workspace/db";

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
    .select({ role: userProfilesTable.role })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));
  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return userId;
}

router.get("/admin/jersey-stubs", async (req, res): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const stubs = await db
    .select()
    .from(jerseyStubsTable)
    .leftJoin(teamsTable, eq(jerseyStubsTable.teamId, teamsTable.id))
    .orderBy(jerseyStubsTable.teamId, jerseyStubsTable.jerseyNumber);

  const results = await Promise.all(
    stubs.map(async ({ jersey_stubs: stub, teams: team }) => {
      const [stats] = await db
        .select({
          gamesPlayed: count(gamePlayerStatsTable.id),
          totalPoints: sum(gamePlayerStatsTable.points),
          totalRebounds: sum(gamePlayerStatsTable.rebounds),
          totalAssists: sum(gamePlayerStatsTable.assists),
        })
        .from(gamePlayerStatsTable)
        .where(eq(gamePlayerStatsTable.playerId, stub.playerId));

      const createdAt =
        stub.createdAt instanceof Date
          ? stub.createdAt.toISOString()
          : String(stub.createdAt);

      return {
        id: stub.id,
        jerseyNumber: stub.jerseyNumber,
        teamId: stub.teamId,
        teamName: team?.name ?? null,
        season: stub.season,
        playerId: stub.playerId,
        claimedByClerkUserId: stub.claimedByClerkUserId ?? null,
        gamesPlayed: Number(stats?.gamesPlayed ?? 0),
        totalPoints: Number(stats?.totalPoints ?? 0),
        totalRebounds: Number(stats?.totalRebounds ?? 0),
        totalAssists: Number(stats?.totalAssists ?? 0),
        createdAt,
      };
    })
  );

  res.json(results);
});

export default router;
