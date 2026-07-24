import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, userProfilesTable, teamsTable, gameTrackingDelegationsTable } from "@workspace/db";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

interface AuthResult {
  userId: string;
  profile: typeof userProfilesTable.$inferSelect;
}

async function requireManager(req: Request, res: Response): Promise<AuthResult | null> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));
  if (!profile || !["admin", "manager"].includes(profile.role) || profile.isPending) {
    res.status(403).json({ error: "Manager access required" });
    return null;
  }
  return { userId, profile };
}

router.get("/manager/my-teams", async (req, res): Promise<void> => {
  const auth = await requireManager(req, res);
  if (!auth) return;

  const { profile } = auth;
  const teamIds = (profile.teamIds as number[] | null) ?? [];

  let teams: typeof teamsTable.$inferSelect[];
  if (profile.role === "admin") {
    teams = await db.select().from(teamsTable).orderBy(teamsTable.name);
  } else if (teamIds.length === 0) {
    teams = [];
  } else {
    teams = await db
      .select()
      .from(teamsTable)
      .where(inArray(teamsTable.id, teamIds))
      .orderBy(teamsTable.name);
  }

  res.json(serializeRows(teams));
});

router.post("/manager/teams", async (req, res): Promise<void> => {
  const auth = await requireManager(req, res);
  if (!auth) return;

  const { userId, profile } = auth;
  const { name, city, league } = req.body as { name?: string; city?: string; league?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "Team name is required" });
    return;
  }

  const abbreviation = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3) || name.slice(0, 3).toUpperCase();

  const [team] = await db
    .insert(teamsTable)
    .values({
      name: name.trim(),
      city: (city ?? "").trim(),
      abbreviation,
      league: league?.trim() ?? null,
      managerClerkUserId: userId,
    })
    .returning();

  const currentTeamIds = (profile.teamIds as number[] | null) ?? [];
  const newTeamIds = [...currentTeamIds, team.id];
  await db
    .update(userProfilesTable)
    .set({ teamIds: newTeamIds, teamId: newTeamIds[0] ?? null, updatedAt: new Date() })
    .where(eq(userProfilesTable.clerkUserId, userId));

  res.status(201).json(serializeRow(team));
});

router.get("/manager/delegations", async (req, res): Promise<void> => {
  const auth = await requireManager(req, res);
  if (!auth) return;

  const { userId } = auth;
  const delegations = await db
    .select()
    .from(gameTrackingDelegationsTable)
    .where(
      and(
        eq(gameTrackingDelegationsTable.managerClerkUserId, userId),
        eq(gameTrackingDelegationsTable.used, false)
      )
    );

  res.json(serializeRows(delegations));
});

router.post("/manager/delegations", async (req, res): Promise<void> => {
  const auth = await requireManager(req, res);
  if (!auth) return;

  const { userId, profile } = auth;
  const { delegateeClerkUserId, teamId } = req.body as {
    delegateeClerkUserId?: string;
    teamId?: number;
  };

  if (!delegateeClerkUserId || !teamId) {
    res.status(400).json({ error: "delegateeClerkUserId and teamId are required" });
    return;
  }

  const teamIds = (profile.teamIds as number[] | null) ?? [];
  if (profile.role !== "admin" && !teamIds.includes(teamId)) {
    res.status(403).json({ error: "You do not manage this team" });
    return;
  }

  const [delegatee] = await db
    .select({ id: userProfilesTable.id })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, delegateeClerkUserId));

  if (!delegatee) {
    res.status(404).json({ error: "Delegatee user not found" });
    return;
  }

  const [delegation] = await db
    .insert(gameTrackingDelegationsTable)
    .values({ managerClerkUserId: userId, delegateeClerkUserId, teamId, used: false })
    .returning();

  res.status(201).json(serializeRow(delegation));
});

router.delete("/manager/delegations/:id", async (req, res): Promise<void> => {
  const auth = await requireManager(req, res);
  if (!auth) return;

  const { userId } = auth;
  const delegationId = parseInt(req.params.id as string, 10);
  if (isNaN(delegationId)) {
    res.status(400).json({ error: "Invalid delegation id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(gameTrackingDelegationsTable)
    .where(
      and(
        eq(gameTrackingDelegationsTable.id, delegationId),
        eq(gameTrackingDelegationsTable.managerClerkUserId, userId)
      )
    );

  if (!existing) {
    res.status(404).json({ error: "Delegation not found" });
    return;
  }

  await db
    .delete(gameTrackingDelegationsTable)
    .where(eq(gameTrackingDelegationsTable.id, delegationId));

  res.status(204).send();
});

export default router;
