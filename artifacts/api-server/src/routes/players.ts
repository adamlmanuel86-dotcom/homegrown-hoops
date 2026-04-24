import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, playersTable, gamePlayerStatsTable, gamesTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import {
  CreatePlayerBody,
  UpdatePlayerBody,
  UpdatePlayerParams,
  GetPlayerParams,
  GetPlayerResponse,
  UpdatePlayerResponse,
  ListPlayersResponse,
  ListPlayersQueryParams,
  GetPlayerStatsParams,
  GetPlayerStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/players", async (req, res): Promise<void> => {
  const query = ListPlayersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  let players;
  if (query.data.teamId) {
    players = await db.select().from(playersTable).where(eq(playersTable.teamId, query.data.teamId)).orderBy(playersTable.lastName);
  } else {
    players = await db.select().from(playersTable).orderBy(playersTable.lastName);
  }
  res.json(ListPlayersResponse.parse(serializeRows(players)));
});

router.post("/players", async (req, res): Promise<void> => {
  const parsed = CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [player] = await db.insert(playersTable).values(parsed.data).returning();
  res.status(201).json(GetPlayerResponse.parse(serializeRow(player)));
});

router.get("/players/:id", async (req, res): Promise<void> => {
  const params = GetPlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, params.data.id));
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json(GetPlayerResponse.parse(serializeRow(player)));
});

router.patch("/players/:id", async (req, res): Promise<void> => {
  const params = UpdatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [player] = await db.update(playersTable).set(parsed.data).where(eq(playersTable.id, params.data.id)).returning();
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json(UpdatePlayerResponse.parse(serializeRow(player)));
});

// GET /players/:id/seasons — distinct seasons a player has game data for
router.get("/players/:id/seasons", async (req, res): Promise<void> => {
  const params = GetPlayerStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const playerId = params.data.id;

  const rows = await db
    .select({ season: gamesTable.season })
    .from(gamePlayerStatsTable)
    .innerJoin(gamesTable, eq(gamePlayerStatsTable.gameId, gamesTable.id))
    .where(eq(gamePlayerStatsTable.playerId, playerId));

  const seasons = [...new Set(rows.map((r) => r.season).filter(Boolean))].sort().reverse();
  res.json({ seasons });
});

router.get("/players/:id/stats", async (req, res): Promise<void> => {
  const params = GetPlayerStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const playerId = params.data.id;
  const season = typeof req.query.season === "string" ? req.query.season : undefined;

  const rows = season
    ? await db
        .select({ stat: gamePlayerStatsTable })
        .from(gamePlayerStatsTable)
        .innerJoin(gamesTable, eq(gamePlayerStatsTable.gameId, gamesTable.id))
        .where(and(eq(gamePlayerStatsTable.playerId, playerId), eq(gamesTable.season, season)))
        .then((r) => r.map((x) => x.stat))
    : await db
        .select()
        .from(gamePlayerStatsTable)
        .where(eq(gamePlayerStatsTable.playerId, playerId));

  const gamesPlayed = rows.length;

  if (gamesPlayed === 0) {
    res.json(GetPlayerStatsResponse.parse({
      playerId,
      gamesPlayed: 0,
      totalPoints: 0,
      totalRebounds: 0,
      totalAssists: 0,
      totalThreesMade: 0,
      avgPoints: 0,
      avgRebounds: 0,
      avgAssists: 0,
      avgThreesMade: 0,
      avgSteals: 0,
      avgBlocks: 0,
      avgTurnovers: 0,
      avgMinutes: 0,
      fieldGoalPct: 0,
      threePointPct: 0,
      freeThrowPct: 0,
    }));
    return;
  }

  const totalPoints = rows.reduce((s, r) => s + r.points, 0);
  const totalRebounds = rows.reduce((s, r) => s + r.rebounds, 0);
  const totalAssists = rows.reduce((s, r) => s + r.assists, 0);
  const totalSteals = rows.reduce((s, r) => s + r.steals, 0);
  const totalBlocks = rows.reduce((s, r) => s + r.blocks, 0);
  const totalTurnovers = rows.reduce((s, r) => s + r.turnovers, 0);
  const totalMinutes = rows.reduce((s, r) => s + r.minutesPlayed, 0);
  const totalFgm = rows.reduce((s, r) => s + r.fieldGoalsMade, 0);
  const totalFga = rows.reduce((s, r) => s + r.fieldGoalsAttempted, 0);
  const total3m = rows.reduce((s, r) => s + r.threesMade, 0);
  const total3a = rows.reduce((s, r) => s + r.threesAttempted, 0);
  const totalFtm = rows.reduce((s, r) => s + r.freeThrowsMade, 0);
  const totalFta = rows.reduce((s, r) => s + r.freeThrowsAttempted, 0);

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const pct = (made: number, att: number) => att > 0 ? Math.round((made / att) * 1000) / 10 : 0;

  res.json(GetPlayerStatsResponse.parse({
    playerId,
    gamesPlayed,
    totalPoints,
    totalRebounds,
    totalAssists,
    totalThreesMade: total3m,
    avgPoints: round1(totalPoints / gamesPlayed),
    avgRebounds: round1(totalRebounds / gamesPlayed),
    avgAssists: round1(totalAssists / gamesPlayed),
    avgThreesMade: round1(total3m / gamesPlayed),
    avgSteals: round1(totalSteals / gamesPlayed),
    avgBlocks: round1(totalBlocks / gamesPlayed),
    avgTurnovers: round1(totalTurnovers / gamesPlayed),
    avgMinutes: round1(totalMinutes / gamesPlayed),
    fieldGoalPct: pct(totalFgm, totalFga),
    threePointPct: pct(total3m, total3a),
    freeThrowPct: pct(totalFtm, totalFta),
  }));
});

export default router;
