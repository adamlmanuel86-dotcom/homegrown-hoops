import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, teamsTable, gamesTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import {
  CreateTeamBody,
  UpdateTeamBody,
  UpdateTeamParams,
  GetTeamParams,
  GetTeamResponse,
  UpdateTeamResponse,
  ListTeamsResponse,
  GetTeamStatsParams,
  GetTeamStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/teams", async (_req, res): Promise<void> => {
  const teams = await db.select().from(teamsTable).orderBy(teamsTable.name);
  res.json(ListTeamsResponse.parse(serializeRows(teams)));
});

router.post("/teams", async (req, res): Promise<void> => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db.insert(teamsTable).values(parsed.data).returning();
  res.status(201).json(GetTeamResponse.parse(serializeRow(team)));
});

router.get("/teams/:id", async (req, res): Promise<void> => {
  const params = GetTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(GetTeamResponse.parse(serializeRow(team)));
});

router.patch("/teams/:id", async (req, res): Promise<void> => {
  const params = UpdateTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db.update(teamsTable).set(parsed.data).where(eq(teamsTable.id, params.data.id)).returning();
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(UpdateTeamResponse.parse(serializeRow(team)));
});

router.get("/teams/:id/stats", async (req, res): Promise<void> => {
  const params = GetTeamStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const teamId = params.data.id;
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  const games = await db
    .select()
    .from(gamesTable)
    .where(
      sql`(${gamesTable.homeTeamId} = ${teamId} OR ${gamesTable.awayTeamId} = ${teamId}) AND ${gamesTable.status} = 'final'`
    );

  let totalHomeScore = 0;
  let totalAwayScore = 0;
  let totalPointsFor = 0;
  let totalPointsAgainst = 0;
  const totalGames = games.length;

  for (const g of games) {
    const homeScore = g.homeScore ?? 0;
    const awayScore = g.awayScore ?? 0;
    if (g.homeTeamId === teamId) {
      totalPointsFor += homeScore;
      totalPointsAgainst += awayScore;
    } else {
      totalPointsFor += awayScore;
      totalPointsAgainst += homeScore;
    }
  }

  const stats = {
    teamId,
    wins: team.wins,
    losses: team.losses,
    avgPoints: totalGames > 0 ? Math.round((totalPointsFor / totalGames) * 10) / 10 : 0,
    avgPointsAllowed: totalGames > 0 ? Math.round((totalPointsAgainst / totalGames) * 10) / 10 : 0,
    totalGames,
  };

  res.json(GetTeamStatsResponse.parse(stats));
});

export default router;
