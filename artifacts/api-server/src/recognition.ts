import { and, eq, or } from "drizzle-orm";
import {
  db,
  gamePlayerStatsTable,
  gamesTable,
  userProfilesTable,
  playersTable,
  teamsTable,
} from "@workspace/db";
import type { ArchetypeHistoryEntry } from "@workspace/db";

type RecEntry = { id: string; earnedAt: string; season?: string };

type GameStat = {
  gameDate: string;
  season: string;
  points: number;
  rebounds: number;
  assists: number;
  threesMade: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutesPlayed: number;
};

// ─── Career milestone definitions ────────────────────────────────────────────
type CareerTotals = {
  points: number;
  rebounds: number;
  assists: number;
  threesMade: number;
  steals: number;
  blocks: number;
};

const MILESTONES: Array<{
  id: string;
  stat: (t: CareerTotals) => number;
  threshold: number;
  bonusLP: number;
}> = [
  { id: "pts_100",  stat: (t) => t.points,    threshold: 100,  bonusLP: 500 },
  { id: "pts_250",  stat: (t) => t.points,    threshold: 250,  bonusLP: 1000 },
  { id: "pts_500",  stat: (t) => t.points,    threshold: 500,  bonusLP: 2500 },
  { id: "pts_1000", stat: (t) => t.points,    threshold: 1000, bonusLP: 5000 },
  { id: "reb_50",   stat: (t) => t.rebounds,  threshold: 50,   bonusLP: 500 },
  { id: "reb_100",  stat: (t) => t.rebounds,  threshold: 100,  bonusLP: 1000 },
  { id: "ast_50",   stat: (t) => t.assists,   threshold: 50,   bonusLP: 500 },
  { id: "ast_100",  stat: (t) => t.assists,   threshold: 100,  bonusLP: 1000 },
  { id: "three_50", stat: (t) => t.threesMade,threshold: 50,   bonusLP: 1000 },
  { id: "stl_50",   stat: (t) => t.steals,    threshold: 50,   bonusLP: 750 },
  { id: "blk_50",   stat: (t) => t.blocks,    threshold: 50,   bonusLP: 750 },
];

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
  { id: "lifted",    passes: (s) => s.steals >= 2 },
  { id: "not_today", passes: (s) => s.blocks >= 2 },
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
  "rip_tide",
  "the_wall",
  "all_tide",
  "dead_calm",
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
      season: gamesTable.season,
      points: gamePlayerStatsTable.points,
      rebounds: gamePlayerStatsTable.rebounds,
      assists: gamePlayerStatsTable.assists,
      threesMade: gamePlayerStatsTable.threesMade,
      steals: gamePlayerStatsTable.steals,
      blocks: gamePlayerStatsTable.blocks,
      turnovers: gamePlayerStatsTable.turnovers,
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
      season: row.season,
      points: row.points ?? 0,
      rebounds: row.rebounds ?? 0,
      assists: row.assists ?? 0,
      threesMade: row.threesMade ?? 0,
      steals: row.steals ?? 0,
      blocks: row.blocks ?? 0,
      turnovers: row.turnovers ?? 0,
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
      season: gamesTable.season,
      homeTeamId: gamesTable.homeTeamId,
      awayTeamId: gamesTable.awayTeamId,
      homeScore: gamesTable.homeScore,
      awayScore: gamesTable.awayScore,
      points: gamePlayerStatsTable.points,
      rebounds: gamePlayerStatsTable.rebounds,
      assists: gamePlayerStatsTable.assists,
      threesMade: gamePlayerStatsTable.threesMade,
      steals: gamePlayerStatsTable.steals,
      blocks: gamePlayerStatsTable.blocks,
      turnovers: gamePlayerStatsTable.turnovers,
      minutesPlayed: gamePlayerStatsTable.minutesPlayed,
    })
    .from(gamePlayerStatsTable)
    .innerJoin(gamesTable, eq(gamePlayerStatsTable.gameId, gamesTable.id))
    .where(eq(gamePlayerStatsTable.playerId, playerId));

  const newStamps: RecEntry[] = [];

  // Per-game stamp checks
  for (const row of rows) {
    const gameStat: GameStat = {
      gameDate: row.gameDate,
      season: row.season,
      points: row.points ?? 0,
      rebounds: row.rebounds ?? 0,
      assists: row.assists ?? 0,
      threesMade: row.threesMade ?? 0,
      steals: row.steals ?? 0,
      blocks: row.blocks ?? 0,
      turnovers: row.turnovers ?? 0,
      minutesPlayed: row.minutesPlayed,
    };
    for (const { id, passes } of STAMP_CHECKS) {
      if (passes(gameStat)) {
        newStamps.push({ id, earnedAt: row.gameDate });
      }
    }

    // Sure Hands — per-game: turnovers explicitly recorded as zero (not null/unknown)
    if (row.turnovers !== null && row.turnovers === 0) {
      newStamps.push({ id: "sure_hands", earnedAt: row.gameDate });
    }
  }

  newStamps.sort((a, b) => a.earnedAt.localeCompare(b.earnedAt));

  // ── Battle Tested career stamp ───────────────────────────────────────────
  // Awarded once when a player has been on the winning team in 4+ career games.
  const playerTeamId = player.teamId;
  const winRows = rows.filter((r) => {
    const { homeScore, awayScore, homeTeamId, awayTeamId } = r;
    if (homeScore == null || awayScore == null) return false;
    if (homeTeamId === playerTeamId) return homeScore > awayScore;
    if (awayTeamId === playerTeamId) return awayScore > homeScore;
    return false;
  });
  if (winRows.length >= 4) {
    const sortedWins = [...winRows].sort((a, b) => a.gameDate.localeCompare(b.gameDate));
    newStamps.push({ id: "battle_tested", earnedAt: sortedWins[3].gameDate });
  }

  // ── Career milestone check ───────────────────────────────────────────────
  const careerTotals: CareerTotals = {
    points:    rows.reduce((s, r) => s + (r.points    ?? 0), 0),
    rebounds:  rows.reduce((s, r) => s + (r.rebounds  ?? 0), 0),
    assists:   rows.reduce((s, r) => s + (r.assists   ?? 0), 0),
    threesMade:rows.reduce((s, r) => s + (r.threesMade?? 0), 0),
    steals:    rows.reduce((s, r) => s + (r.steals    ?? 0), 0),
    blocks:    rows.reduce((s, r) => s + (r.blocks    ?? 0), 0),
  };

  const today = new Date().toISOString().split("T")[0];
  const existingMilestones = (profile.milestones ?? []) as RecEntry[];
  const existingMilestoneIds = new Set(existingMilestones.map((m) => m.id));
  const newMilestones: RecEntry[] = [...existingMilestones];

  for (const { id, stat, threshold } of MILESTONES) {
    if (!existingMilestoneIds.has(id) && stat(careerTotals) >= threshold) {
      newMilestones.push({ id, earnedAt: today });
    }
  }

  await db
    .update(userProfilesTable)
    .set({ stamps: newStamps, milestones: newMilestones, updatedAt: new Date() })
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
    totalSteals: number;
    totalBlocks: number;
    highestGamePoints: number;
    stdDevPoints: number;
    improvement: number;
    composite: number;
    gamesPlayed: number;
    avgTurnovers: number;
  };

  const metrics: Metrics[] = playerStats.map((p) => {
    const pts = p.games.map((g) => g.points);
    const reb = p.games.map((g) => g.rebounds);
    const ast = p.games.map((g) => g.assists);
    const stl = p.games.map((g) => g.steals);
    const blk = p.games.map((g) => g.blocks);
    const tov = p.games.map((g) => g.turnovers);
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
      totalSteals: stl.reduce((s, n) => s + n, 0),
      totalBlocks: blk.reduce((s, n) => s + n, 0),
      highestGamePoints: pts.length ? Math.max(...pts) : 0,
      stdDevPoints: stdDev(pts),
      improvement: halfImprovement(dates, pts),
      composite: avgPts + avgReb + avgAst,
      gamesPlayed: p.games.length,
      avgTurnovers: mean(tov),
    };
  });

  function topOf(key: (m: Metrics) => number, filter?: (m: Metrics) => boolean): Metrics | null {
    const pool = filter ? metrics.filter(filter) : metrics;
    if (pool.length === 0) return null;
    return pool.reduce((best, m) => (key(m) > key(best) ? m : best));
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
    rip_tide:    topOf((m) => m.totalSteals),
    the_wall:    topOf((m) => m.totalBlocks),
    all_tide:    topOf((m) => m.totalAssists + m.totalSteals),
    // Dead Calm: lowest avg turnovers, min 5 games played to qualify
    dead_calm:   topOf((m) => -m.avgTurnovers, (m) => m.gamesPlayed >= 5),
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
//
// Weighted per-game category scores:
//   Scoring score    = PPG × 10
//   Rebounding score = RPG × 15
//   Playmaking score = APG × 20
//   Steals score     = SPG × 35
//   Blocks score     = BPG × 35
//   Three-point score = 3PM × 40
//
// Priority rules (first match wins):
//  1. Scoring ≥ 150 AND highest scorer on team  → The Mainstay
//  2. Scoring ≥ 150 AND not highest scorer      → The Voltage
//  3. Scoring 120–149 AND (rebounding > 75 OR playmaking > 60) → The Engine
//  4. Three-point score highest AND ≥ 60 AND ≥ 1.5 3PM/game → The Deep
//  5. Rebounding score highest AND ≥ 75          → The Vortex
//  6. Playmaking score highest AND ≥ 75          → The Current
//  7. Steals score highest AND ≥ 52              → The Warden
//  8. Blocks score highest AND ≥ 35              → The Wall
//  9. Everything else                            → The Climb
// No games recorded                              → Uncharted
export async function recalculateArchetypesForTeam(
  teamId: number,
  season: string
): Promise<void> {
  const seasonStats = await getSeasonPlayerStats(season);
  const teamStats = seasonStats.filter((p) => p.teamId === teamId);

  // Build per-player averages for everyone in teamStats (has ≥1 game)
  type PlayerAvgs = {
    firstName: string;
    lastName: string;
    gamesPlayed: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgThrees: number;
    avgSteals: number;
    avgBlocks: number;
  };

  const avgs: PlayerAvgs[] = teamStats.map((p) => ({
    firstName:   p.firstName,
    lastName:    p.lastName,
    gamesPlayed: p.games.length,
    avgPoints:   mean(p.games.map((g) => g.points)),
    avgRebounds: mean(p.games.map((g) => g.rebounds)),
    avgAssists:  mean(p.games.map((g) => g.assists)),
    avgThrees:   mean(p.games.map((g) => g.threesMade)),
    avgSteals:   mean(p.games.map((g) => g.steals)),
    avgBlocks:   mean(p.games.map((g) => g.blocks)),
  }));

  // ── Assign archetypes ────────────────────────────────────────────────────
  const assignments = new Map<string, string>();

  if (avgs.length === 1) {
    // ── Solo-player path ────────────────────────────────────────────────────
    // When only one player is on the team there is no meaningful "highest on
    // team" comparison — they would win every category by default.  Instead,
    // assign an archetype purely from absolute stat thresholds, then fall back
    // to their single strongest category so they are never stuck on The Climb
    // simply because no team-mates exist to compare against.
    const p   = avgs[0];
    const key = `${p.firstName}|${p.lastName}`;
    const sc  = p.avgPoints   * 10;
    const rb  = p.avgRebounds * 15;
    const pl  = p.avgAssists  * 20;
    const st  = p.avgSteals   * 35;
    const bl  = p.avgBlocks   * 35;
    const th  = p.avgThrees   * 40;

    let archetype: string;
    if      (sc >= 150)                               archetype = "The Mainstay";
    else if (sc >= 120 && (rb > 75 || pl > 60))       archetype = "The Engine";
    else if (th >= 60 && p.avgThrees >= 1.5)          archetype = "The Deep";
    else if (rb >= 75)                                archetype = "The Vortex";
    else if (pl >= 75)                                archetype = "The Current";
    else if (st >= 52)                                archetype = "The Warden";
    else if (bl >= 35)                                archetype = "The Wall";
    else {
      // Below all absolute thresholds — give the player the archetype for their
      // single highest weighted score so the card always reflects their game.
      const categories = [
        { id: "The Mainstay", score: sc },
        { id: "The Deep",     score: th },
        { id: "The Vortex",   score: rb },
        { id: "The Current",  score: pl },
        { id: "The Warden",   score: st },
        { id: "The Wall",     score: bl },
      ];
      const best = categories.reduce((a, b) => (b.score > a.score ? b : a));
      archetype = best.score > 0 ? best.id : "The Climb";
    }

    assignments.set(key, archetype);

  } else if (avgs.length > 1) {
    // ── Multi-player path — team comparison ─────────────────────────────────
    const teamMaxReb    = Math.max(...avgs.map((a) => a.avgRebounds * 15));
    const teamMaxPl     = Math.max(...avgs.map((a) => a.avgAssists  * 20));
    const teamMaxSt     = Math.max(...avgs.map((a) => a.avgSteals   * 35));
    const teamMaxBl     = Math.max(...avgs.map((a) => a.avgBlocks   * 35));
    const teamMaxThrees = Math.max(...avgs.map((a) => a.avgThrees   * 40));

    const topScorer    = avgs.reduce((best, p) => (p.avgPoints > best.avgPoints ? p : best));
    const topScorerKey = `${topScorer.firstName}|${topScorer.lastName}`;

    const isHighest = (val: number, max: number) => Math.abs(val - max) <= 1e-10;

    for (const p of avgs) {
      const key  = `${p.firstName}|${p.lastName}`;
      const sc   = p.avgPoints   * 10;
      const rb   = p.avgRebounds * 15;
      const pl   = p.avgAssists  * 20;
      const st   = p.avgSteals   * 35;
      const bl   = p.avgBlocks   * 35;
      const th   = p.avgThrees   * 40;
      const isTopScorer = key === topScorerKey;

      let archetype: string;
      if      (sc >= 150 && isTopScorer)                                          archetype = "The Mainstay";
      else if (sc >= 150)                                                          archetype = "The Voltage";
      else if (sc >= 120 && sc < 150 && (rb > 75 || pl > 60))                    archetype = "The Engine";
      else if (isHighest(th, teamMaxThrees) && th >= 60 && p.avgThrees >= 1.5)   archetype = "The Deep";
      else if (isHighest(rb, teamMaxReb)    && rb >= 75)                          archetype = "The Vortex";
      else if (isHighest(pl, teamMaxPl)     && pl >= 75)                          archetype = "The Current";
      else if (isHighest(st, teamMaxSt)     && st >= 52)                          archetype = "The Warden";
      else if (isHighest(bl, teamMaxBl)     && bl >= 35)                          archetype = "The Wall";
      else                                                                         archetype = "The Climb";

      assignments.set(key, archetype);
    }
  }

  // ── Step 3: Persist ────────────────────────────────────────────────────────
  const profiles = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.teamId, teamId));

  for (const profile of profiles) {
    const key = `${profile.firstName}|${profile.lastName}`;
    // Players not in assignments have no season stats → Uncharted
    const newArchetype = assignments.get(key) ?? "Uncharted";
    if (profile.archetype !== newArchetype) {
      await db
        .update(userProfilesTable)
        .set({ archetype: newArchetype, updatedAt: new Date() })
        .where(eq(userProfilesTable.id, profile.id));
    }
  }
}

// ─── Team-scoped tide calculation ─────────────────────────────────────────────

export type TideWinner = {
  tideId: string;
  tideLabel: string;
  playerName: string;
};

const TIDE_LABELS: Record<string, string> = {
  high_tide:   "High Tide",
  the_keeper:  "The Keeper",
  the_source:  "The Source",
  the_swell:   "The Swell",
  lighthouse:  "Lighthouse",
  rising_tide: "Rising Tide",
  shoreline:   "Shoreline",
  the_crest:   "The Crest",
  rip_tide:    "Rip Tide",
  the_wall:    "The Wall",
  all_tide:    "All Tide",
  dead_calm:   "Dead Calm",
};

export async function getTeamCurrentSeason(teamId: number): Promise<string | null> {
  const rows = await db
    .select({ season: gamesTable.season })
    .from(gamesTable)
    .where(or(eq(gamesTable.homeTeamId, teamId), eq(gamesTable.awayTeamId, teamId)));
  if (rows.length === 0) return null;
  return rows.reduce((best, r) => (r.season > best.season ? r : best)).season;
}

async function computeTeamTideWinners(teamId: number, season: string): Promise<TideWinner[]> {
  const allPlayerStats = await getSeasonPlayerStats(season);
  const teamStats = allPlayerStats.filter((p) => p.teamId === teamId);
  if (teamStats.length === 0) return [];

  // Count total games the team played this season (for Shoreline eligibility)
  const teamGameRows = await db
    .select({ id: gamesTable.id })
    .from(gamesTable)
    .where(
      and(
        or(eq(gamesTable.homeTeamId, teamId), eq(gamesTable.awayTeamId, teamId)),
        eq(gamesTable.season, season)
      )
    );
  const totalTeamGames = teamGameRows.length;

  const metrics = teamStats.map((p) => {
    const pts   = p.games.map((g) => g.points);
    const reb   = p.games.map((g) => g.rebounds);
    const ast   = p.games.map((g) => g.assists);
    const stl   = p.games.map((g) => g.steals);
    const blk   = p.games.map((g) => g.blocks);
    const tov   = p.games.map((g) => g.turnovers);
    const dates = p.games.map((g) => g.gameDate);
    const m     = mean(pts);
    const maxDev = pts.length ? Math.max(...pts.map((v) => Math.abs(v - m))) : 0;
    return {
      firstName:         p.firstName,
      lastName:          p.lastName,
      totalPoints:       pts.reduce((s, n) => s + n, 0),
      totalRebounds:     reb.reduce((s, n) => s + n, 0),
      totalAssists:      ast.reduce((s, n) => s + n, 0),
      totalSteals:       stl.reduce((s, n) => s + n, 0),
      totalBlocks:       blk.reduce((s, n) => s + n, 0),
      highestGamePoints: pts.length ? Math.max(...pts) : 0,
      stdDevPoints:      stdDev(pts),
      maxDeviationPts:   maxDev,
      improvement:       halfImprovement(dates, pts),
      composite:         mean(pts) + mean(reb) + mean(ast),
      gamesPlayed:       p.games.length,
      avgTurnovers:      mean(tov),
    };
  });

  type M = (typeof metrics)[0];

  // Returns ALL players who share the best value on the primary metric.
  // If a secondary tie-breaker is provided, it is applied first; players still
  // mathematically tied after the secondary metric all receive the tide.
  function topAll(primary: (m: M) => number, secondary?: (m: M) => number): M[] {
    if (metrics.length === 0) return [];

    let pool = metrics;

    // Apply secondary first if provided (narrows the pool before primary check)
    if (secondary) {
      const bestSecondary = Math.max(...pool.map(secondary));
      const afterSecondary = pool.filter((m) => Math.abs(secondary(m) - bestSecondary) <= 1e-10);
      // Only narrow the pool when the secondary actually differentiates
      if (afterSecondary.length < pool.length) pool = afterSecondary;
    }

    const bestPrimary = Math.max(...pool.map(primary));
    return pool.filter((m) => Math.abs(primary(m) - bestPrimary) <= 1e-10);
  }

  const results: TideWinner[] = [];

  // All tides that award to the single best player (or all who are genuinely tied)
  const tidesSpec: Array<{
    tideId: string;
    primary: (m: M) => number;
    secondary?: (m: M) => number;
  }> = [
    { tideId: "high_tide",   primary: (m) => m.totalPoints },
    { tideId: "the_keeper",  primary: (m) => m.totalRebounds },
    { tideId: "the_source",  primary: (m) => m.totalAssists },
    { tideId: "the_swell",   primary: (m) => m.highestGamePoints },
    // Lighthouse: lowest stddev; tie-break by lowest max single-game deviation
    {
      tideId: "lighthouse",
      primary:   (m) => -m.stdDevPoints,
      secondary: (m) => -m.maxDeviationPts,
    },
    { tideId: "rising_tide", primary: (m) => m.improvement },
    { tideId: "the_crest",   primary: (m) => m.composite },
    { tideId: "rip_tide",    primary: (m) => m.totalSteals },
    { tideId: "the_wall",    primary: (m) => m.totalBlocks },
    { tideId: "all_tide",    primary: (m) => m.totalAssists + m.totalSteals },
  ];

  for (const { tideId, primary, secondary } of tidesSpec) {
    for (const w of topAll(primary, secondary)) {
      results.push({
        tideId,
        tideLabel: TIDE_LABELS[tideId] ?? tideId,
        playerName: `${w.firstName} ${w.lastName}`,
      });
    }
  }

  // Shoreline: ALL players who appeared in every team game this season
  const shorelineWinners = totalTeamGames > 0
    ? metrics.filter((m) => m.gamesPlayed >= totalTeamGames)
    : topAll((m) => m.gamesPlayed); // fallback: all who played the most

  for (const w of shorelineWinners) {
    results.push({
      tideId: "shoreline",
      tideLabel: "Shoreline",
      playerName: `${w.firstName} ${w.lastName}`,
    });
  }

  // Dead Calm: player(s) with the lowest avg turnovers — minimum 5 games played
  const deadCalmPool = metrics.filter((m) => m.gamesPlayed >= 5);
  if (deadCalmPool.length > 0) {
    const bestAvgTov = Math.min(...deadCalmPool.map((m) => m.avgTurnovers));
    const deadCalmWinners = deadCalmPool.filter(
      (m) => Math.abs(m.avgTurnovers - bestAvgTov) <= 1e-10
    );
    for (const w of deadCalmWinners) {
      results.push({
        tideId: "dead_calm",
        tideLabel: "Dead Calm",
        playerName: `${w.firstName} ${w.lastName}`,
      });
    }
  }

  return results;
}

export async function previewTeamTides(
  teamId: number,
  season?: string
): Promise<{ season: string; winners: TideWinner[] }> {
  const resolvedSeason = season ?? (await getTeamCurrentSeason(teamId));
  if (!resolvedSeason) return { season: "", winners: [] };
  const winners = await computeTeamTideWinners(teamId, resolvedSeason);
  return { season: resolvedSeason, winners };
}

export async function applyTeamTides(
  teamId: number,
  season?: string
): Promise<{ season: string; winners: TideWinner[] }> {
  const resolvedSeason = season ?? (await getTeamCurrentSeason(teamId));
  if (!resolvedSeason) return { season: "", winners: [] };

  const winners = await computeTeamTideWinners(teamId, resolvedSeason);
  const today = new Date().toISOString().split("T")[0];

  const tidesByName = new Map<string, string[]>();
  for (const { tideId, playerName } of winners) {
    if (!tidesByName.has(playerName)) tidesByName.set(playerName, []);
    tidesByName.get(playerName)!.push(tideId);
  }

  const teamProfiles = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.teamId, teamId));

  for (const profile of teamProfiles) {
    const name = `${profile.firstName} ${profile.lastName}`;
    const wonTideIds = tidesByName.get(name) ?? [];
    const existing = (profile.tides ?? []) as RecEntry[];
    const kept = existing.filter((t) => !AUTO_TIDE_IDS.includes(t.id as AutoTideId));
    const gained: RecEntry[] = wonTideIds.map((id) => ({ id, earnedAt: today, season: resolvedSeason }));
    const newTides = [...kept, ...gained];
    const changed = JSON.stringify(newTides) !== JSON.stringify(existing);
    if (changed) {
      await db
        .update(userProfilesTable)
        .set({ tides: newTides, updatedAt: new Date() })
        .where(eq(userProfilesTable.id, profile.id));
    }
  }

  return { season: resolvedSeason, winners };
}

export async function resetTeamSeason(
  teamId: number,
  newSeasonName?: string,
  closingSeason?: string
): Promise<{ season: string; playersArchived: number }> {
  const resolvedSeason = closingSeason ?? (await getTeamCurrentSeason(teamId));
  if (!resolvedSeason) return { season: "", playersArchived: 0 };

  // ── Archive: save the closing season's archetype for each player, then
  //    reset archetype to Uncharted for the fresh season.
  //
  //    NOTHING is deleted. All game stats, tides (season-tagged), and stamps
  //    remain in the database permanently and are viewable via the season
  //    selector on player profiles.
  // ─────────────────────────────────────────────────────────────────────────

  const teamProfiles = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.teamId, teamId));

  let playersArchived = 0;
  for (const profile of teamProfiles) {
    // Append (or overwrite) the archetype entry for the closing season
    const existingHistory = ((profile.archetypeHistory ?? []) as ArchetypeHistoryEntry[])
      .filter((h) => h.season !== resolvedSeason);
    const newHistory: ArchetypeHistoryEntry[] = [
      ...existingHistory,
      { season: resolvedSeason, archetype: profile.archetype ?? "Uncharted" },
    ];

    await db
      .update(userProfilesTable)
      .set({
        archetypeHistory: newHistory,
        archetype:        "Uncharted",
        updatedAt:        new Date(),
      })
      .where(eq(userProfilesTable.id, profile.id));

    playersArchived++;
  }

  // Stamps are permanent career achievements — untouched.
  // Tides remain on each profile, tagged with their season, permanently viewable.
  // Game stats remain in game_player_stats permanently — no rows are deleted.

  // Mark the new active season on the team so Season History knows immediately
  // which season is "current" — even before any games are created.
  if (newSeasonName) {
    await db
      .update(teamsTable)
      .set({ currentSeason: newSeasonName })
      .where(eq(teamsTable.id, teamId));
  }

  return { season: resolvedSeason, playersArchived };
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
