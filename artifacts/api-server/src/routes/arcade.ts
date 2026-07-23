import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, max, count, sql } from "drizzle-orm";
import { db, arcadeSessionsTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";

const router = Router();

const VALID_GAMES = ["fast-break", "who-ya-got", "shot-clock"] as const;
type ArcadeGame = (typeof VALID_GAMES)[number];

router.post("/arcade/sessions", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { game, score, bestStreak, roundsPlayed } = req.body as {
    game: unknown;
    score: unknown;
    bestStreak: unknown;
    roundsPlayed: unknown;
  };

  if (!VALID_GAMES.includes(game as ArcadeGame)) {
    return res.status(400).json({ error: "Invalid game" });
  }
  if (typeof score !== "number" || typeof bestStreak !== "number" || typeof roundsPlayed !== "number") {
    return res.status(400).json({ error: "score, bestStreak, and roundsPlayed must be numbers" });
  }

  const [session] = await db
    .insert(arcadeSessionsTable)
    .values({
      clerkUserId: userId,
      game: game as string,
      score: Math.max(0, Math.floor(score)),
      bestStreak: Math.max(0, Math.floor(bestStreak)),
      roundsPlayed: Math.max(0, Math.floor(roundsPlayed)),
    })
    .returning();

  return res.status(201).json(serializeRow(session));
});

router.get("/arcade/my-stats", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db
    .select({
      game: arcadeSessionsTable.game,
      bestScore: max(arcadeSessionsTable.score),
      bestStreak: max(arcadeSessionsTable.bestStreak),
      gamesPlayed: count(arcadeSessionsTable.id),
    })
    .from(arcadeSessionsTable)
    .where(eq(arcadeSessionsTable.clerkUserId, userId))
    .groupBy(arcadeSessionsTable.game);

  const statsMap: Record<string, { bestScore: number; bestStreak: number; gamesPlayed: number } | null> = {
    "fast-break": null,
    "who-ya-got": null,
    "shot-clock": null,
  };

  for (const row of rows) {
    statsMap[row.game] = {
      bestScore: Number(row.bestScore ?? 0),
      bestStreak: Number(row.bestStreak ?? 0),
      gamesPlayed: Number(row.gamesPlayed ?? 0),
    };
  }

  return res.json({
    fastBreak: statsMap["fast-break"],
    whoYaGot: statsMap["who-ya-got"],
    shotClock: statsMap["shot-clock"],
  });
});

export default router;
