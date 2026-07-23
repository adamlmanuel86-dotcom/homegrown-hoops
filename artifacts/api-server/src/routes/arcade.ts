import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq, max, count, sum, sql } from "drizzle-orm";
import { db, arcadeSessionsTable } from "@workspace/db";
import { serializeRow } from "../lib/serialize";

const router = Router();

const VALID_GAMES = ["fast-break", "who-ya-got", "shot-clock"] as const;
type ArcadeGame = (typeof VALID_GAMES)[number];

router.post("/arcade/sessions", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { game, score, bestStreak, roundsPlayed, fgm, fga, tpm, tpa, dunks } = req.body as Record<string, unknown>;

  if (!VALID_GAMES.includes(game as ArcadeGame)) {
    return res.status(400).json({ error: "Invalid game" });
  }
  if (typeof score !== "number" || typeof bestStreak !== "number" || typeof roundsPlayed !== "number") {
    return res.status(400).json({ error: "score, bestStreak, and roundsPlayed must be numbers" });
  }

  const toInt = (v: unknown) => (typeof v === "number" ? Math.max(0, Math.floor(v)) : 0);

  const [session] = await db
    .insert(arcadeSessionsTable)
    .values({
      clerkUserId: userId,
      game: game as string,
      score: toInt(score),
      bestStreak: toInt(bestStreak),
      roundsPlayed: toInt(roundsPlayed),
      fgm: toInt(fgm),
      fga: toInt(fga),
      tpm: toInt(tpm),
      tpa: toInt(tpa),
      dunks: toInt(dunks),
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
      totalFgm: sum(arcadeSessionsTable.fgm),
      totalFga: sum(arcadeSessionsTable.fga),
      totalTpm: sum(arcadeSessionsTable.tpm),
      totalTpa: sum(arcadeSessionsTable.tpa),
      totalDunks: sum(arcadeSessionsTable.dunks),
    })
    .from(arcadeSessionsTable)
    .where(eq(arcadeSessionsTable.clerkUserId, userId))
    .groupBy(arcadeSessionsTable.game);

  type GameStats = {
    bestScore: number;
    bestStreak: number;
    gamesPlayed: number;
    totalFgm: number;
    totalFga: number;
    totalTpm: number;
    totalTpa: number;
    totalDunks: number;
  } | null;

  const statsMap: Record<string, GameStats> = {
    "fast-break": null,
    "who-ya-got": null,
    "shot-clock": null,
  };

  for (const row of rows) {
    statsMap[row.game] = {
      bestScore: Number(row.bestScore ?? 0),
      bestStreak: Number(row.bestStreak ?? 0),
      gamesPlayed: Number(row.gamesPlayed ?? 0),
      totalFgm: Number(row.totalFgm ?? 0),
      totalFga: Number(row.totalFga ?? 0),
      totalTpm: Number(row.totalTpm ?? 0),
      totalTpa: Number(row.totalTpa ?? 0),
      totalDunks: Number(row.totalDunks ?? 0),
    };
  }

  return res.json({
    fastBreak: statsMap["fast-break"],
    whoYaGot: statsMap["who-ya-got"],
    shotClock: statsMap["shot-clock"],
  });
});

router.get("/arcade/leaderboard", async (req, res) => {
  const { game, limit: limitStr } = req.query as { game?: string; limit?: string };
  if (!VALID_GAMES.includes(game as ArcadeGame)) {
    return res.status(400).json({ error: "Invalid game" });
  }
  const limit = Math.min(Math.max(parseInt(limitStr ?? "10", 10) || 10, 1), 50);

  const rows = await db.execute<{
    rank: string;
    clerk_user_id: string;
    display_name: string;
    best_score: string;
  }>(sql`
    SELECT
      RANK() OVER (ORDER BY s.best_score DESC) AS rank,
      s.clerk_user_id,
      COALESCE(p.first_name || ' ' || p.last_name, 'Player') AS display_name,
      s.best_score
    FROM (
      SELECT clerk_user_id, MAX(score) AS best_score
      FROM arcade_sessions
      WHERE game = ${game}
      GROUP BY clerk_user_id
    ) s
    LEFT JOIN user_profiles p ON p.clerk_user_id = s.clerk_user_id
    ORDER BY s.best_score DESC
    LIMIT ${limit}
  `);

  return res.json(
    rows.rows.map((r) => ({
      rank: Number(r.rank),
      clerkUserId: r.clerk_user_id,
      displayName: r.display_name,
      bestScore: Number(r.best_score),
    }))
  );
});

router.get("/arcade/my-rank", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { game } = req.query as { game?: string };
  if (!VALID_GAMES.includes(game as ArcadeGame)) {
    return res.status(400).json({ error: "Invalid game" });
  }

  const rankResult = await db.execute<{ rank: string; total: string; best_score: string }>(sql`
    SELECT rank, total, best_score FROM (
      SELECT
        clerk_user_id,
        MAX(score) AS best_score,
        COUNT(*) OVER () AS total,
        RANK() OVER (ORDER BY MAX(score) DESC) AS rank
      FROM arcade_sessions
      WHERE game = ${game}
      GROUP BY clerk_user_id
    ) ranked
    WHERE clerk_user_id = ${userId}
  `);

  if (rankResult.rows.length === 0) {
    const totalResult = await db.execute<{ total: string }>(sql`
      SELECT COUNT(DISTINCT clerk_user_id) AS total FROM arcade_sessions WHERE game = ${game}
    `);
    return res.json({ rank: null, total: Number(totalResult.rows[0]?.total ?? 0), bestScore: 0 });
  }

  const { rank, total, best_score } = rankResult.rows[0];
  return res.json({ rank: Number(rank), total: Number(total), bestScore: Number(best_score) });
});

export default router;
