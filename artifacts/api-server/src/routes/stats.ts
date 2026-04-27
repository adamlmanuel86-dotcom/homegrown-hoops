import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, gamePlayerStatsTable, playersTable, teamsTable, gamesTable } from "@workspace/db";
import {
  GetStatLeadersResponse,
  GetStatsSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getLeaders(field: "points" | "rebounds" | "assists" | "threesMade", limit = 100) {
  const col = gamePlayerStatsTable[field];
  const rows = await db
    .select({
      playerId: playersTable.id,
      firstName: playersTable.firstName,
      lastName: playersTable.lastName,
      number: playersTable.number,
      teamName: teamsTable.name,
      teamAbbreviation: teamsTable.abbreviation,
      value: sql<number>`COALESCE(AVG(${col}), 0)`,
    })
    .from(gamePlayerStatsTable)
    .innerJoin(playersTable, eq(gamePlayerStatsTable.playerId, playersTable.id))
    .leftJoin(teamsTable, eq(playersTable.teamId, teamsTable.id))
    .groupBy(playersTable.id, playersTable.firstName, playersTable.lastName, playersTable.number, teamsTable.name, teamsTable.abbreviation)
    .orderBy(desc(sql<number>`AVG(${col})`))
    .limit(limit);

  return rows
    .map(r => ({ ...r, value: Math.round(Number(r.value) * 10) / 10 }))
    .slice(0, limit);
}

router.get("/stats/leaders", async (_req, res): Promise<void> => {
  const [points, rebounds, assists, threesMade] = await Promise.all([
    getLeaders("points"),
    getLeaders("rebounds"),
    getLeaders("assists"),
    getLeaders("threesMade"),
  ]);

  res.json(GetStatLeadersResponse.parse({ points, rebounds, assists, threesMade }));
});

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const [[{ totalTeams }], [{ totalPlayers }], [{ totalGames }], [{ totalGamesCompleted }]] = await Promise.all([
    db.select({ totalTeams: sql<number>`COUNT(*)` }).from(teamsTable),
    db.select({ totalPlayers: sql<number>`COUNT(*)` }).from(playersTable),
    db.select({ totalGames: sql<number>`COUNT(*)` }).from(gamesTable),
    db.select({ totalGamesCompleted: sql<number>`COUNT(*)` }).from(gamesTable).where(eq(gamesTable.status, "final")),
  ]);

  const recentGamesRaw = await db
    .select()
    .from(gamesTable)
    .orderBy(desc(gamesTable.gameDate))
    .limit(5);

  const recentGames = recentGamesRaw.map(g => ({
    ...g,
    createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : g.createdAt,
  }));

  res.json(GetStatsSummaryResponse.parse({
    totalTeams: Number(totalTeams),
    totalPlayers: Number(totalPlayers),
    totalGames: Number(totalGames),
    totalGamesCompleted: Number(totalGamesCompleted),
    recentGames,
  }));
});

export default router;
