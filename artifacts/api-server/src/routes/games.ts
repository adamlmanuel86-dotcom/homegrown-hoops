import { Router, type IRouter } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, gamesTable, gamePlayerStatsTable, teamsTable, userProfilesTable, playersTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";
import { runFullRecognition } from "../recognition";
import {
  CreateGameBody,
  UpdateGameBody,
  UpdateGameParams,
  GetGameParams,
  GetGameResponse,
  UpdateGameResponse,
  ListGamesResponse,
  ListGamesQueryParams,
  GetGamePlayerStatsParams,
  GetGamePlayerStatsResponse,
  UpsertGamePlayerStatsParams,
  UpsertGamePlayerStatsBody,
  UpsertGamePlayerStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/games", async (req, res): Promise<void> => {
  const query = ListGamesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let games;
  if (query.data.teamId && query.data.season) {
    games = await db
      .select()
      .from(gamesTable)
      .where(
        and(
          or(eq(gamesTable.homeTeamId, query.data.teamId), eq(gamesTable.awayTeamId, query.data.teamId)),
          eq(gamesTable.season, query.data.season)
        )
      )
      .orderBy(desc(gamesTable.gameDate));
  } else if (query.data.teamId) {
    games = await db
      .select()
      .from(gamesTable)
      .where(or(eq(gamesTable.homeTeamId, query.data.teamId), eq(gamesTable.awayTeamId, query.data.teamId)))
      .orderBy(desc(gamesTable.gameDate));
  } else if (query.data.season) {
    games = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.season, query.data.season))
      .orderBy(desc(gamesTable.gameDate));
  } else {
    games = await db.select().from(gamesTable).orderBy(desc(gamesTable.gameDate));
  }
  res.json(ListGamesResponse.parse(serializeRows(games)));
});

router.post("/games", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = CreateGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [game] = await db.insert(gamesTable).values(parsed.data).returning();
  res.status(201).json(GetGameResponse.parse(serializeRow(game)));
});

router.get("/games/:id", async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(GetGameResponse.parse(serializeRow(game)));
});

router.delete("/games/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid game id" });
    return;
  }

  // game_player_stats and game_videos cascade on delete
  const [deleted] = await db.delete(gamesTable).where(eq(gamesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  res.status(204).send();
});

router.patch("/games/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = UpdateGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [game] = await db.update(gamesTable).set(parsed.data).where(eq(gamesTable.id, params.data.id)).returning();
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  if (game.status === "final" && game.homeScore != null && game.awayScore != null) {
    const allGames = await db.select().from(gamesTable).where(eq(gamesTable.status, "final"));

    const calcRecord = (teamId: number) => {
      let wins = 0;
      let losses = 0;
      for (const g of allGames) {
        const homeScore = g.homeScore ?? 0;
        const awayScore = g.awayScore ?? 0;
        if (g.homeTeamId === teamId) {
          if (homeScore > awayScore) wins++;
          else losses++;
        } else if (g.awayTeamId === teamId) {
          if (awayScore > homeScore) wins++;
          else losses++;
        }
      }
      return { wins, losses };
    };

    const homeRecord = calcRecord(game.homeTeamId);
    const awayRecord = calcRecord(game.awayTeamId);

    await db.update(teamsTable).set(homeRecord).where(eq(teamsTable.id, game.homeTeamId));
    await db.update(teamsTable).set(awayRecord).where(eq(teamsTable.id, game.awayTeamId));
  }

  res.json(UpdateGameResponse.parse(serializeRow(game)));
});

router.get("/games/:id/player-stats", async (req, res): Promise<void> => {
  const params = GetGamePlayerStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const stats = await db.select().from(gamePlayerStatsTable).where(eq(gamePlayerStatsTable.gameId, params.data.id));
  res.json(GetGamePlayerStatsResponse.parse(stats));
});

router.post("/games/:id/player-stats", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = UpsertGamePlayerStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpsertGamePlayerStatsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const gameId = params.data.id;
  const results = [];
  for (const stat of parsed.data) {
    const existing = await db
      .select()
      .from(gamePlayerStatsTable)
      .where(and(eq(gamePlayerStatsTable.gameId, gameId), eq(gamePlayerStatsTable.playerId, stat.playerId)));
    if (existing.length > 0) {
      const [updated] = await db
        .update(gamePlayerStatsTable)
        .set(stat)
        .where(and(eq(gamePlayerStatsTable.gameId, gameId), eq(gamePlayerStatsTable.playerId, stat.playerId)))
        .returning();
      results.push(updated);
    } else {
      const [inserted] = await db
        .insert(gamePlayerStatsTable)
        .values({ ...stat, gameId })
        .returning();
      results.push(inserted);
    }
  }

  // Fire recognition in the background — do not await so the response is immediate
  const playerIds = parsed.data.map((s) => s.playerId);
  runFullRecognition(gameId, playerIds).catch((err) =>
    console.error("[recognition] runFullRecognition failed:", err)
  );

  res.json(UpsertGamePlayerStatsResponse.parse(results));
});

router.delete("/games/:id/player-stats/:playerId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const gameId = parseInt(req.params.id);
  const playerId = parseInt(req.params.playerId);
  if (isNaN(gameId) || isNaN(playerId)) {
    res.status(400).json({ error: "Invalid game or player id" });
    return;
  }

  const [deleted] = await db
    .delete(gamePlayerStatsTable)
    .where(
      and(
        eq(gamePlayerStatsTable.gameId, gameId),
        eq(gamePlayerStatsTable.playerId, playerId)
      )
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Stat entry not found" });
    return;
  }

  // Check if the player has any remaining stats across ALL games (not just this one)
  const remainingStats = await db
    .select({
      points: gamePlayerStatsTable.points,
      rebounds: gamePlayerStatsTable.rebounds,
      assists: gamePlayerStatsTable.assists,
    })
    .from(gamePlayerStatsTable)
    .where(eq(gamePlayerStatsTable.playerId, playerId));

  const totalPoints   = remainingStats.reduce((s, r) => s + (r.points   ?? 0), 0);
  const totalRebounds = remainingStats.reduce((s, r) => s + (r.rebounds ?? 0), 0);
  const totalAssists  = remainingStats.reduce((s, r) => s + (r.assists  ?? 0), 0);

  if (totalPoints === 0 && totalRebounds === 0 && totalAssists === 0) {
    // No meaningful stats remain — directly reset the linked profile
    const [playerRow] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (playerRow) {
      await db
        .update(userProfilesTable)
        .set({ archetype: "Uncharted", stamps: [], updatedAt: new Date() })
        .where(
          and(
            eq(userProfilesTable.firstName, playerRow.firstName),
            eq(userProfilesTable.lastName, playerRow.lastName)
          )
        );
    }
  }

  // Still run full recognition to recalculate archetypes for the rest of the team
  runFullRecognition(gameId, [playerId]).catch((err) =>
    console.error("[recognition] runFullRecognition after delete failed:", err)
  );

  res.status(204).send();
});

export default router;
