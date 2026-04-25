import { Router, type IRouter } from "express";
import { eq, sum, count, desc, inArray, and, gte } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  db,
  isoBallSessionsTable,
  isoBallDailyQuestionsTable,
  userProfilesTable,
} from "@workspace/db";
import { isProtectedAdmin } from "../lib/adminGuard";

const router: IRouter = Router();

const POINTS_PER_CORRECT: Record<string, number> = {
  rookie: 10,
  varsity: 20,
  elite: 35,
};

const DAILY_SESSION_LIMIT = 5;
const COOLDOWN_SECONDS = 60;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayStartUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function getBallKnowledgeLevel(totalPoints: number): string {
  if (totalPoints >= 800) return "Elite Playmaker";
  if (totalPoints >= 500) return "High Basketball IQ";
  if (totalPoints >= 250) return "Varsity Vision";
  if (totalPoints >= 100) return "Court Aware";
  if (totalPoints >= 1) return "Rookie IQ";
  return "none";
}

const PLAYBOOK_STAMP_ID = "the-playbook";

async function ensurePlaybookStamp(clerkUserId: string, totalPoints: number) {
  const [profile] = await db
    .select({ id: userProfilesTable.id, stamps: userProfilesTable.stamps })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId));

  if (!profile) return;

  const stamps = profile.stamps ?? [];
  const hasStamp = stamps.some((s: { id: string }) => s.id === PLAYBOOK_STAMP_ID);

  if (totalPoints >= 800 && !hasStamp) {
    await db
      .update(userProfilesTable)
      .set({
        stamps: [...stamps, { id: PLAYBOOK_STAMP_ID, earnedAt: new Date().toISOString() }],
        updatedAt: new Date(),
      })
      .where(eq(userProfilesTable.clerkUserId, clerkUserId));
  } else if (totalPoints < 800 && hasStamp) {
    await db
      .update(userProfilesTable)
      .set({
        stamps: stamps.filter((s: { id: string }) => s.id !== PLAYBOOK_STAMP_ID),
        updatedAt: new Date(),
      })
      .where(eq(userProfilesTable.clerkUserId, clerkUserId));
  }
}

// GET /iso-ball/daily-status — auth required; returns session counts + per-difficulty cooldowns
router.get("/iso-ball/daily-status", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.json({
      sessionsByDifficulty: { rookie: 0, varsity: 0, elite: 0 },
      cooldownByDifficulty: { rookie: 0, varsity: 0, elite: 0 },
    });
    return;
  }

  const todayStart = todayStartUTC();
  const difficulties = ["rookie", "varsity", "elite"] as const;

  const sessionRows = await db
    .select({ difficulty: isoBallSessionsTable.difficulty, cnt: count() })
    .from(isoBallSessionsTable)
    .where(
      and(
        eq(isoBallSessionsTable.clerkUserId, userId),
        gte(isoBallSessionsTable.playedAt, todayStart),
      )
    )
    .groupBy(isoBallSessionsTable.difficulty);

  const sessionsByDifficulty: Record<string, number> = { rookie: 0, varsity: 0, elite: 0 };
  for (const row of sessionRows) {
    sessionsByDifficulty[row.difficulty] = Number(row.cnt);
  }

  // Per-difficulty cooldown: last session time for each difficulty
  const lastSessionRows = await db
    .select({ difficulty: isoBallSessionsTable.difficulty, playedAt: isoBallSessionsTable.playedAt })
    .from(isoBallSessionsTable)
    .where(eq(isoBallSessionsTable.clerkUserId, userId))
    .orderBy(desc(isoBallSessionsTable.playedAt));

  const lastByDiff: Record<string, Date | null> = { rookie: null, varsity: null, elite: null };
  for (const row of lastSessionRows) {
    if (difficulties.includes(row.difficulty as typeof difficulties[number]) && !lastByDiff[row.difficulty]) {
      lastByDiff[row.difficulty] = row.playedAt;
    }
  }

  const cooldownByDifficulty: Record<string, number> = { rookie: 0, varsity: 0, elite: 0 };
  for (const diff of difficulties) {
    const last = lastByDiff[diff];
    if (last) {
      const secs = (Date.now() - last.getTime()) / 1000;
      cooldownByDifficulty[diff] = Math.max(0, Math.ceil(COOLDOWN_SECONDS - secs));
    }
  }

  res.json({ sessionsByDifficulty, cooldownByDifficulty });
});

// POST /iso-ball/sessions — save a session (auth required)
router.post("/iso-ball/sessions", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { difficulty, correctQuestionIndices } = req.body as {
    difficulty: string;
    correctQuestionIndices: number[];
  };

  if (!difficulty || !POINTS_PER_CORRECT[difficulty]) {
    res.status(400).json({ error: "Invalid difficulty" });
    return;
  }
  if (
    !Array.isArray(correctQuestionIndices) ||
    correctQuestionIndices.length > 10 ||
    correctQuestionIndices.some((i) => typeof i !== "number" || i < 0 || i > 99)
  ) {
    res.status(400).json({ error: "Invalid correctQuestionIndices" });
    return;
  }

  const todayStart = todayStartUTC();
  const today = todayUTC();

  // ── Cooldown check (per-difficulty) ────────────────────────────────────────
  const [lastSession] = await db
    .select({ playedAt: isoBallSessionsTable.playedAt })
    .from(isoBallSessionsTable)
    .where(
      and(
        eq(isoBallSessionsTable.clerkUserId, userId),
        eq(isoBallSessionsTable.difficulty, difficulty),
      )
    )
    .orderBy(desc(isoBallSessionsTable.playedAt))
    .limit(1);

  const secondsSinceLast = lastSession
    ? (Date.now() - lastSession.playedAt.getTime()) / 1000
    : Infinity;

  if (secondsSinceLast < COOLDOWN_SECONDS) {
    const [totalsRow] = await db
      .select({ total: sum(isoBallSessionsTable.pointsEarned) })
      .from(isoBallSessionsTable)
      .where(eq(isoBallSessionsTable.clerkUserId, userId));
    const totalPoints = Number(totalsRow?.total ?? 0);

    res.json({
      success: true,
      pointsEarned: 0,
      deduped: 0,
      totalPoints,
      level: getBallKnowledgeLevel(totalPoints),
      reason: "cooldown",
      cooldownSecondsLeft: Math.ceil(COOLDOWN_SECONDS - secondsSinceLast),
      sessionsToday: 0,
      dailySessionsLeft: 0,
      locked: false,
    });
    return;
  }

  // ── Daily session limit check ───────────────────────────────────────────────
  const [todayCount] = await db
    .select({ cnt: count() })
    .from(isoBallSessionsTable)
    .where(
      and(
        eq(isoBallSessionsTable.clerkUserId, userId),
        eq(isoBallSessionsTable.difficulty, difficulty),
        gte(isoBallSessionsTable.playedAt, todayStart),
      )
    );

  const sessionsToday = Number(todayCount?.cnt ?? 0);

  if (sessionsToday >= DAILY_SESSION_LIMIT) {
    const [totalsRow] = await db
      .select({ total: sum(isoBallSessionsTable.pointsEarned) })
      .from(isoBallSessionsTable)
      .where(eq(isoBallSessionsTable.clerkUserId, userId));
    const totalPoints = Number(totalsRow?.total ?? 0);

    res.json({
      success: true,
      pointsEarned: 0,
      deduped: 0,
      totalPoints,
      level: getBallKnowledgeLevel(totalPoints),
      reason: "daily_limit",
      sessionsToday,
      dailySessionsLeft: 0,
      locked: true,
    });
    return;
  }

  // ── Per-question deduplication ──────────────────────────────────────────────
  const alreadyEarned = await db
    .select({ questionIndex: isoBallDailyQuestionsTable.questionIndex })
    .from(isoBallDailyQuestionsTable)
    .where(
      and(
        eq(isoBallDailyQuestionsTable.clerkUserId, userId),
        eq(isoBallDailyQuestionsTable.difficulty, difficulty),
        eq(isoBallDailyQuestionsTable.date, today),
      )
    );

  const alreadyEarnedSet = new Set(alreadyEarned.map((r) => r.questionIndex));
  const newCorrectIndices = correctQuestionIndices.filter((i) => !alreadyEarnedSet.has(i));
  const dedupedCount = correctQuestionIndices.length - newCorrectIndices.length;

  const pointsEarned = newCorrectIndices.length * POINTS_PER_CORRECT[difficulty];
  const score = correctQuestionIndices.length;

  // ── Save session ────────────────────────────────────────────────────────────
  await db.insert(isoBallSessionsTable).values({
    clerkUserId: userId,
    difficulty,
    score,
    pointsEarned,
  });

  if (newCorrectIndices.length > 0) {
    await db.insert(isoBallDailyQuestionsTable).values(
      newCorrectIndices.map((qi) => ({
        clerkUserId: userId,
        difficulty,
        questionIndex: qi,
        date: today,
      }))
    );
  }

  // ── Total points + stamp ────────────────────────────────────────────────────
  const [totalsRow] = await db
    .select({ total: sum(isoBallSessionsTable.pointsEarned) })
    .from(isoBallSessionsTable)
    .where(eq(isoBallSessionsTable.clerkUserId, userId));

  const totalPoints = Number(totalsRow?.total ?? 0);
  await ensurePlaybookStamp(userId, totalPoints);

  const level = getBallKnowledgeLevel(totalPoints);
  const newSessionsToday = sessionsToday + 1;

  res.json({
    success: true,
    pointsEarned,
    deduped: dedupedCount,
    totalPoints,
    level,
    reason: null,
    sessionsToday: newSessionsToday,
    dailySessionsLeft: Math.max(0, DAILY_SESSION_LIMIT - newSessionsToday),
    locked: newSessionsToday >= DAILY_SESSION_LIMIT,
  });
});

// GET /iso-ball/profile/:clerkUserId — public
router.get("/iso-ball/profile/:clerkUserId", async (req, res) => {
  const { clerkUserId } = req.params;

  const [totals] = await db
    .select({
      total: sum(isoBallSessionsTable.pointsEarned),
      sessions: count(),
    })
    .from(isoBallSessionsTable)
    .where(eq(isoBallSessionsTable.clerkUserId, clerkUserId));

  const totalPoints = Number(totals?.total ?? 0);
  const sessionCount = Number(totals?.sessions ?? 0);
  const level = getBallKnowledgeLevel(totalPoints);

  res.json({ totalPoints, sessionCount, level });
});

// GET /iso-ball/leaderboard — public
router.get("/iso-ball/leaderboard", async (req, res) => {
  const rows = await db
    .select({
      clerkUserId: isoBallSessionsTable.clerkUserId,
      totalPoints: sum(isoBallSessionsTable.pointsEarned),
      sessions: count(),
    })
    .from(isoBallSessionsTable)
    .groupBy(isoBallSessionsTable.clerkUserId)
    .orderBy(desc(sum(isoBallSessionsTable.pointsEarned)))
    .limit(20);

  const clerkIds = rows.map((r) => r.clerkUserId);
  if (clerkIds.length === 0) {
    res.json([]);
    return;
  }

  const profiles = await db
    .select({
      clerkUserId: userProfilesTable.clerkUserId,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      avatarUrl: userProfilesTable.avatarUrl,
    })
    .from(userProfilesTable)
    .where(inArray(userProfilesTable.clerkUserId, clerkIds));

  const profileMap = new Map(profiles.map((p) => [p.clerkUserId, p]));

  const leaderboard = rows.map((r, i) => {
    const prof = profileMap.get(r.clerkUserId);
    const totalPoints = Number(r.totalPoints ?? 0);
    return {
      rank: i + 1,
      clerkUserId: r.clerkUserId,
      firstName: prof?.firstName ?? "Unknown",
      lastName: prof?.lastName ?? "",
      avatarUrl: prof?.avatarUrl ?? null,
      totalPoints,
      sessions: Number(r.sessions ?? 0),
      level: getBallKnowledgeLevel(totalPoints),
    };
  });

  res.json(leaderboard);
});

// DELETE /iso-ball/sessions/:clerkUserId — admin: reset a player's ball knowledge
router.delete("/iso-ball/sessions/:clerkUserId", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [myProfile] = await db
    .select({ role: userProfilesTable.role })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (myProfile?.role !== "admin" && !isProtectedAdmin(userId)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { clerkUserId } = req.params;

  await db
    .delete(isoBallSessionsTable)
    .where(eq(isoBallSessionsTable.clerkUserId, clerkUserId));

  await db
    .delete(isoBallDailyQuestionsTable)
    .where(eq(isoBallDailyQuestionsTable.clerkUserId, clerkUserId));

  await ensurePlaybookStamp(clerkUserId, 0);

  res.json({ success: true });
});

export default router;
