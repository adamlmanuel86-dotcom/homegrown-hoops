import { and, eq } from "drizzle-orm";
import {
  db,
  gamePlayerStatsTable,
  gamesTable,
  userProfilesTable,
  playersTable,
} from "@workspace/db";

type RecEntry = { id: string; earnedAt: string };

type GameStat = {
  gameDate: string;
  points: number;
  rebounds: number;
  assists: number;
  threesMade: number;
  minutesPlayed: number;
};

// ─── Stamp threshold checks ───────────────────────────────────────────────────
const STAMP_CHECKS: Array<{ id: string; passes: (s: GameStat) => boolean }> = [
  { id: "double_digits", passes: (s) => s.points >= 10 },
  { id: "glass_work",    passes: (s) => s.rebounds >= 5 },
  { id: "goggles",       passes: (s) => s.assists >= 4 },
  { id: "wet",           passes: (s) => s.points >= 25 },
  { id: "the_distance",  passes: (s) => s.threesMade >= 3 },
  { id: "full_send",     passes: (s) => s.points >= 1 && s.rebounds >= 1 && s.assists >= 1 },
  {
    id: "the_double",
    passes: (s) =>
      (s.points >= 10 && s.rebounds >= 10) ||
      (s.points >= 10 && s.assists >= 10)  ||
      (s.rebounds >= 10 && s.assists >= 10),
  },
  {
    id: "full_flood",
    passes: (s) => s.points >= 10 && s.rebounds >= 10 && s.assists >= 10,
  },
];

// ─── Tide IDs automatically calculated ───────────────────────────────────────
const AUTO_TIDE_IDS = [
  "high_tide",
  "the_keeper",
  "the_source",
  "the_swell",
  "lighthouse",
  "rising_tide",
  "shoreline",
  "the_crest",
] as const;
type AutoTideId = (typeof AUTO_TIDE_IDS)[number];

// ─── Maths helpers ────────────────────────────────────────────────────────────
function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length);
}

function halfImprovement(gameDates: string[], values: number[]): number {
  const pairs = gameDates
    .map((d, i) => ({ d, v: values[i] }))
    .sort((a, b) => a.d.localeCompare(b.d));
  const half = Math.floor(pairs.length / 2);
  if (half < 1) return 0;
  const firstAvg = mean(pairs.slice(0, half).map((p) => p.v));
  const secondAvg = mean(pairs.slice(half).map((p) => p.v));
  return secondAvg - firstAvg;
}

// ─── Find user profile by player name ────────────────────────────────────────
async function findProfileByName(firstName: string, lastName: string) {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(
      and(
        eq(userProfilesTable.firstName, firstName),
        eq(userProfilesTable.lastName, lastName)
      )
    );
  return profile ?? null;
}

// ─── Get all season stats grouped by player ───────────────────────────────────
async function getSeasonPlayerStats(season: string) {
  const rows = await db
    .select({
      playerId: playersTable.id,
      firstName: playersTable.firstName,
      lastName: playersTable.lastName,
      teamId: playersTable.teamId,
      gameDate: gamesTable.gameDate,
      points: gamePlayerStatsTable.points,
      rebounds: gamePlayerStatsTable.rebounds,
      assists: gamePlayerStatsTable.assists,
      threesMade: gamePlayerStatsTable.threesMade,
      minutesPlayed: gamePlayerStatsTable.minutesPlayed,
    })
    .from(gamePlayerStatsTable)
    .innerJoin(gamesTable, eq(gamePlayerStatsTable.gameId, gamesTable.id))
    .innerJoin(playersTable, eq(gamePlayerStatsTable.playerId, playersTable.id))
    .where(eq(gamesTable.season, season));

  const map = new Map<
    number,
    {
      playerId: number;
      firstName: string;
      lastName: string;
      teamId: number | null;
      games: GameStat[];
    }
  >();

  for (const row of rows) {
    if (!map.has(row.playerId)) {
      map.set(row.playerId, {
        playerId: row.playerId,
        firstName: row.firstName,
        lastName: row.lastName,
        teamId: row.teamId,
        games: [],
      });
    }
    map.get(row.playerId)!.games.push({
      gameDate: row.gameDate,
      points: row.points,
      rebounds: row.rebounds,
      assists: row.assists,
      threesMade: row.threesMade,
      minutesPlayed: row.minutesPlayed,
    });
  }

  return [...map.values()];
}

// ─── 1. Recalculate stamps for one player ─────────────────────────────────────
export async function recalculateStampsForPlayer(playerId: number): Promise<void> {
  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, playerId));
  if (!player) return;

  const profile = await findProfileByName(player.firstName, player.lastName);
  if (!profile) return;

  const rows = await db
    .select({
      gameDate: gamesTable.gameDate,
      points: gamePlayerStatsTable.points,
      rebounds: gamePlayerStatsTable.rebounds,
      assists: gamePlayerStatsTable.assists,
      threesMade: gamePlayerStatsTable.threesMade,
      minutesPlayed: gamePlayerStatsTable.minutesPlayed,
    })
    .from(gamePlayerStatsTable)
    .innerJoin(gamesTable, eq(gamePlayerStatsTable.gameId, gamesTable.id))
    .where(eq(gamePlayerStatsTable.playerId, playerId));

  const newStamps: RecEntry[] = [];
  for (const row of rows) {
    for (const { id, passes } of STAMP_CHECKS) {
      if (passes(row)) {
        newStamps.push({ id, earnedAt: row.gameDate });
      }
    }
  }
  newStamps.sort((a, b) => a.earnedAt.localeCompare(b.earnedAt));

  await db
    .update(userProfilesTable)
    .set({ stamps: newStamps, updatedAt: new Date() })
    .where(eq(userProfilesTable.id, profile.id));
}

// ─── 2. Recalculate tides for a season ───────────────────────────────────────
export async function recalculateTides(season: string): Promise<void> {
  const playerStats = await getSeasonPlayerStats(season);
  if (playerStats.length === 0) return;

  type Metrics = {
    firstName: string;
    lastName: string;
    avgPoints: number;
  totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
  highestGamePoints: number;
    stdDevPoints: number;
    improvement: number;
    composite: number;
  gamesPlayed: number;
  };

  const metrics: Metrics[] = playerStats.map((p) => {
    const pts = p.games.map((g) => g.points);
    const reb = p.games.map((g) => g.rebounds);
    const ast = p.games.map((g) => g.assists);
    const dates = p.games.map((g) => g.gameDate);
    const avgPts = mean(pts);
    const avgReb = mean(reb);
    const avgAst = mean(ast);
    return {
      firstName: p.firstName,
      lastName: p.lastName,
      avgPoints: avgPts,
      totalPoints: pts.reduce((s, n) => s + n, 0),
      totalRebounds: reb.reduce((s, n) => s + n, 0),
      totalAssists: ast.reduce((s, n) => s + n, 0),
      highestGamePoints: pts.length ? Math.max(...pts) : 0,
      stdDevPoints: stdDev(pts),
      improvement: halfImprovement(dates, pts),
      composite: avgPts + avgReb + avgAst,
      gamesPlayed: p.games.length,
    };
  });

  function topOf(key: (m: Metrics) => number): Metrics | null {
    if (metrics.length === 0) return null;
    return metrics.reduce((best, m) => (key(m) > key(best) ? m : best));
  }

  const winners: Record<AutoTideId, Metrics | null> = {
    high_tide:   topOf((m) => m.totalPoints),
    the_keeper:  topOf((m) => m.totalRebounds),
    the_source:  topOf((m) => m.totalAssists),
    the_swell:   topOf((m) => m.highestGamePoints),
    lighthouse:  topOf((m) => -m.stdDevPoints),
    rising_tide: topOf((m) => m.improvement),
    shoreline:   topOf((m) => m.gamesPlayed),
    the_crest:   topOf((m) => m.composite),
  };

  const today = new Date().toISOString().split("T")[0];
  const allProfiles = await db.select().from(userProfilesTable);

  for (const profile of allProfiles) {
    const existing = profile.tides as RecEntry[];
    const kept = existing.filter((t) => !AUTO_TIDE_IDS.includes(t.id as AutoTideId));
    const gained: RecEntry[] = [];

    for (const [tideId, winner] of Object.entries(winners) as [AutoTideId, Metrics | null][]) {
      if (
        winner &&
        winner.firstName === profile.firstName &&
        winner.lastName === profile.lastName
      ) {
        gained.push({ id: tideId, earnedAt: today });
      }
    }

    const newTides = [...kept, ...gained];
    const changed =
      newTides.length !== existing.length ||
      JSON.stringify(newTides) !== JSON.stringify(existing);

    if (changed) {
      await db
        .update(userProfilesTable)
        .set({ tides: newTides, updatedAt: new Date() })
        .where(eq(userProfilesTable.id, profile.id));
    }
  }
}

// ─── 3. Recalculate archetypes for a team ─────────────────────────────────────
export async function recalculateArchetypesForTeam(
  teamId: number,
  season: string
): Promise<void> {
  const seasonStats = await getSeasonPlayerStats(season);
  const teamStats = seasonStats.filter((p) => p.teamId === teamId);
  if (teamStats.length === 0) return;

  type ArchStats = {
    firstName: string;
    lastName: string;
    avgPoints: number;
    totalRebounds: number;
    totalAssists: number;
    totalThrees: number;
    pointsPerMin: number;
    improvement: number;
    avgMinutes: number;
  };

  const stats: ArchStats[] = teamStats.map((p) => {
    const pts = p.games.map((g) => g.points);
    const reb = p.games.map((g) => g.rebounds);
    const ast = p.games.map((g) => g.assists);
    const threes = p.games.map((g) => g.threesMade);
    const mins = p.games.map((g) => g.minutesPlayed);
    const dates = p.games.map((g) => g.gameDate);
    const totalMin = mins.reduce((s, n) => s + n, 0);
    const totalPts = pts.reduce((s, n) => s + n, 0);
    return {
      firstName: p.firstName,
      lastName: p.lastName,
      avgPoints: mean(pts),
      totalRebounds: reb.reduce((s, n) => s + n, 0),
      totalAssists: ast.reduce((s, n) => s + n, 0),
      totalThrees: threes.reduce((s, n) => s + n, 0),
      pointsPerMin: totalMin > 0 ? totalPts / totalMin : 0,
      improvement: halfImprovement(dates, pts),
      avgMinutes: mean(mins),
    };
  });

  function topOf(
    key: (s: ArchStats) => number,
    filter?: (s: ArchStats) => boolean
  ): ArchStats | null {
    const pool = filter ? stats.filter(filter) : stats;
    if (pool.length === 0) return null;
    return pool.reduce((best, s) => (key(s) > key(best) ? s : best));
  }

  // Only players with at least one meaningful stat are eligible for archetypes
  const hasStats = (s: ArchStats) =>
    s.avgPoints > 0 || s.totalRebounds > 0 || s.totalAssists > 0 || s.totalThrees > 0;

  const candidates: Array<{ archetype: string; winner: ArchStats | null }> = [
    { archetype: "The Mainstay", winner: topOf((s) => s.avgPoints,     hasStats) },
    { archetype: "The Vortex",   winner: topOf((s) => s.totalRebounds, hasStats) },
    { archetype: "The Current",  winner: topOf((s) => s.totalAssists,  hasStats) },
    { archetype: "The Deep",     winner: topOf((s) => s.totalThrees,   hasStats) },
    { archetype: "The Spark",    winner: topOf((s) => s.pointsPerMin,  (s) => hasStats(s) && s.avgMinutes < 15) },
    { archetype: "The Climb",    winner: topOf((s) => s.improvement,   hasStats) },
  ];

  const assignments = new Map<string, string>();
  for (const { archetype, winner } of candidates) {
    if (!winner) continue;
    const key = `${winner.firstName}|${winner.lastName}`;
    if (!assignments.has(key)) {
      assignments.set(key, archetype);
    }
  }

  const profiles = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.teamId, teamId));

  for (const profile of profiles) {
    const key = `${profile.firstName}|${profile.lastName}`;
    const newArchetype = assignments.get(key) ?? "Uncharted";
    if (profile.archetype !== newArchetype) {
      await db
        .update(userProfilesTable)
        .set({ archetype: newArchetype, updatedAt: new Date() })
        .where(eq(userProfilesTable.id, profile.id));
    }
  }
}

// ─── 4. Full recognition run (stamps + archetypes only — tides are season-end admin action) ─────
export async function runFullRecognition(
  gameId: number,
  playerIds: number[]
): Promise<void> {
  const [game] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, gameId));
  if (!game) return;

  await Promise.all(playerIds.map((id) => recalculateStampsForPlayer(id)));

  // NOTE: Tides are intentionally NOT calculated here.
  // Tides are awarded only at season end via the admin season-tides endpoint.

  const teamIdSet = new Set<number>();
  const playerRows = await db
    .select({ id: playersTable.id, teamId: playersTable.teamId })
    .from(playersTable)
    .where(
      eq(playersTable.id, playerIds[0])
    );

  for (const pid of playerIds) {
    const rows = await db
      .select({ teamId: playersTable.teamId })
      .from(playersTable)
      .where(eq(playersTable.id, pid));
    const tid = rows[0]?.teamId;
    if (tid != null) teamIdSet.add(tid);
  }
  void playerRows;

  await Promise.all(
    [...teamIdSet].map((tid) => recalculateArchetypesForTeam(tid, game.season))
  );
}
