import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, gamesTable, gamePlayerStatsTable, playersTable, userProfilesTable, jerseyStubsTable, gameTrackingDelegationsTable } from "@workspace/db";
import { serializeRow } from "../lib/serialize";
import { runFullRecognition } from "../recognition";

const router: IRouter = Router();

router.post("/track-game/submit", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, userId));

  if (!profile || !["admin", "manager", "coach"].includes(profile.role) || profile.isPending) {
    res.status(403).json({ error: "Coach, manager, or admin access required" });
    return;
  }

  const body = req.body as {
    homeTeamId?: number | null;
    awayTeamId?: number | null;
    opponentName?: string | null;
    homeScore: number;
    awayScore: number;
    gameDate: string;
    season: string;
    location?: string | null;
    playerStats: Array<{
      playerId?: number | null;
      playerName: string;
      teamId: number;
      points: number;
      rebounds: number;
      assists: number;
      steals?: number;
      blocks?: number;
      turnovers?: number;
      fieldGoalsMade?: number;
      fieldGoalsAttempted?: number;
      threePointersMade?: number;
      threePointersAttempted?: number;
      freeThrowsMade?: number;
      freeThrowsAttempted?: number;
    }>;
  };

  if (body.homeScore == null || body.awayScore == null || !body.gameDate || !body.season) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const homeTeamId = body.homeTeamId ?? null;
  const awayTeamId = body.awayTeamId ?? null;
  const opponentName = body.opponentName ?? null;

  if (!homeTeamId && !awayTeamId) {
    res.status(400).json({ error: "At least one of homeTeamId or awayTeamId is required" });
    return;
  }
  if ((!homeTeamId || !awayTeamId) && !opponentName) {
    res.status(400).json({ error: "opponentName is required when one team has no ID" });
    return;
  }

  // ── Duplicate detection ───────────────────────────────────────────────────
  const registeredTeamIds = [homeTeamId, awayTeamId].filter((id): id is number => id != null);
  for (const tid of registeredTeamIds) {
    const [dup] = await db
      .select({ id: gamesTable.id })
      .from(gamesTable)
      .where(
        and(
          eq(gamesTable.gameDate, body.gameDate),
          or(eq(gamesTable.homeTeamId, tid), eq(gamesTable.awayTeamId, tid))
        )
      );
    if (dup) {
      res.status(409).json({
        error: `A game for this team on ${body.gameDate} has already been submitted. Duplicate games are not allowed.`,
      });
      return;
    }
  }

  // ── Authorization for non-admin roles ────────────────────────────────────
  if (profile.role !== "admin") {
    const managerTeamIds = (profile.teamIds as number[] | null) ?? [];

    const touchedTeams = registeredTeamIds;
    const managedTeamTouched = touchedTeams.some((tid) => managerTeamIds.includes(tid));

    if (!managedTeamTouched) {
      // Check delegations
      const delegationChecks = touchedTeams.map((tid) =>
        and(
          eq(gameTrackingDelegationsTable.delegateeClerkUserId, userId),
          eq(gameTrackingDelegationsTable.teamId, tid),
          eq(gameTrackingDelegationsTable.used, false)
        )
      );

      const activeDelegation = delegationChecks.length > 0
        ? await db.select().from(gameTrackingDelegationsTable).where(
            delegationChecks.length === 1 ? delegationChecks[0]! : or(...delegationChecks)
          ).then((rows) => rows[0] ?? null)
        : null;

      if (!activeDelegation) {
        res.status(403).json({
          error: "You are not authorized to submit games for this team. Contact your manager.",
        });
        return;
      }

      // Mark delegation used
      await db
        .update(gameTrackingDelegationsTable)
        .set({ used: true })
        .where(eq(gameTrackingDelegationsTable.id, activeDelegation.id));
    }
  }

  // ── Game status: admins go straight to final; others go to pending ────────
  const isAdmin = profile.role === "admin";
  const status = isAdmin ? "final" : "pending";

  const [game] = await db
    .insert(gamesTable)
    .values({
      homeTeamId,
      awayTeamId,
      homeScore: body.homeScore,
      awayScore: body.awayScore,
      gameDate: body.gameDate,
      season: body.season,
      location: body.location ?? null,
      status,
      opponentName,
      submittedBy: userId,
      externalLinks: [],
    })
    .returning();

  const resolvedPlayerIds: number[] = [];

  for (const stat of body.playerStats ?? []) {
    let resolvedPlayerId = stat.playerId ?? null;

    if (!resolvedPlayerId && stat.playerName && stat.teamId) {
      const jerseyMatch = stat.playerName.trim().match(/^#(\d+)$/);
      if (jerseyMatch) {
        const jerseyNumber = parseInt(jerseyMatch[1], 10);
        const [existingStub] = await db
          .select({ playerId: jerseyStubsTable.playerId })
          .from(jerseyStubsTable)
          .where(
            and(
              eq(jerseyStubsTable.jerseyNumber, jerseyNumber),
              eq(jerseyStubsTable.teamId, stat.teamId),
              eq(jerseyStubsTable.season, body.season)
            )
          );

        if (existingStub) {
          resolvedPlayerId = existingStub.playerId;
        } else {
          const [stubPlayer] = await db
            .insert(playersTable)
            .values({
              firstName: `#${jerseyNumber}`,
              lastName: "",
              teamId: stat.teamId,
              number: String(jerseyNumber),
              isJerseyStub: true,
            })
            .returning({ id: playersTable.id });
          await db.insert(jerseyStubsTable).values({
            jerseyNumber,
            teamId: stat.teamId,
            season: body.season,
            playerId: stubPlayer.id,
          });
          resolvedPlayerId = stubPlayer.id;
        }
      } else {
        const nameParts = stat.playerName.trim().split(/\s+/);
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ") || "";

        if (firstName) {
          const [existing] = await db
            .select({ id: playersTable.id })
            .from(playersTable)
            .where(
              and(
                eq(playersTable.firstName, firstName),
                eq(playersTable.lastName, lastName),
                eq(playersTable.teamId, stat.teamId)
              )
            );

          if (existing) {
            resolvedPlayerId = existing.id;
          } else {
            const [created] = await db
              .insert(playersTable)
              .values({ firstName, lastName, teamId: stat.teamId })
              .returning({ id: playersTable.id });
            resolvedPlayerId = created.id;
          }
        }
      }
    }

    if (!resolvedPlayerId) continue;

    await db.insert(gamePlayerStatsTable).values({
      gameId: game.id,
      playerId: resolvedPlayerId,
      points: stat.points,
      rebounds: stat.rebounds,
      assists: stat.assists,
      steals: stat.steals ?? null,
      blocks: stat.blocks ?? null,
      turnovers: stat.turnovers ?? null,
      fieldGoalsMade: stat.fieldGoalsMade ?? 0,
      fieldGoalsAttempted: stat.fieldGoalsAttempted ?? 0,
      threesMade: stat.threePointersMade ?? null,
      threesAttempted: stat.threePointersAttempted ?? 0,
      freeThrowsMade: stat.freeThrowsMade ?? 0,
      freeThrowsAttempted: stat.freeThrowsAttempted ?? 0,
      minutesPlayed: 0,
    });
    resolvedPlayerIds.push(resolvedPlayerId);
  }

  // Only run recognition immediately for admin submissions (final status)
  if (isAdmin && resolvedPlayerIds.length > 0) {
    try {
      await runFullRecognition(game.id, resolvedPlayerIds);
    } catch (err) {
      console.error("[trackGame] Recognition error (non-fatal):", err);
    }
  }

  res.status(201).json(serializeRow(game));
});

export default router;
