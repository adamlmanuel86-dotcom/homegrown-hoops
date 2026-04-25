import { Router, type IRouter } from "express";
import { eq, sum, count, desc, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, isoBallSessionsTable, userProfilesTable } from "@workspace/db";
import { isProtectedAdmin } from "../lib/adminGuard";

const router: IRouter = Router();

const POINTS_PER_CORRECT: Record<string, number> = {
  rookie: 10,
  varsity: 15,
  elite: 20,
};

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

// POST /iso-ball/sessions — save a session (auth required)
router.post("/iso-ball/sessions", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { difficulty, score } = req.body as { difficulty: string; score: number };

  if (!difficulty || !POINTS_PER_CORRECT[difficulty]) {
    res.status(400).json({ error: "Invalid difficulty" });
    return;
  }
  if (typeof score !== "number" || score < 0 || score > 10) {
    res.status(400).json({ error: "Invalid score" });
    return;
  }

  const pointsEarned = score * POINTS_PER_CORRECT[difficulty];

  await db.insert(isoBallSessionsTable).values({
    clerkUserId: userId,
    difficulty,
    score,
    pointsEarned,
  });

  // Get new total
  const [totals] = await db
    .select({ total: sum(isoBallSessionsTable.pointsEarned) })
    .from(isoBallSessionsTable)
    .where(eq(isoBallSessionsTable.clerkUserId, userId));

  const totalPoints = Number(totals?.total ?? 0);

  await ensurePlaybookStamp(userId, totalPoints);

  const level = getBallKnowledgeLevel(totalPoints);
  res.json({ success: true, pointsEarned, totalPoints, level });
});

// GET /iso-ball/profile/:clerkUserId — public: get a user's ball knowledge totals
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

// GET /iso-ball/leaderboard — public: top players by total points
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

  await ensurePlaybookStamp(clerkUserId, 0);

  res.json({ success: true });
});

export default router;
