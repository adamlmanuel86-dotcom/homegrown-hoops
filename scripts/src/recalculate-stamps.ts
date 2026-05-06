/**
 * Recalculate stamps (including Battle Tested) for all players in Railway.
 * Rebuilds every player's stamp array from scratch using live game data.
 *
 * Run: pnpm --filter @workspace/scripts run recalc-stamps
 */
import pg from "pg";

const DB_URL =
  process.env.RAILWAY_DB_URL ??
  "postgresql://postgres:dlQosuUfRaioPgyIzfQLJipwKRwXKZfb@switchyard.proxy.rlwy.net:18663/railway";

const pool = new pg.Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

interface GameStatRow {
  gameDate: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  teamId: number;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  threesMade: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
}

function computeStamps(rows: GameStatRow[]): { id: string; earnedAt: string }[] {
  const stamps: { id: string; earnedAt: string }[] = [];

  for (const r of rows) {
    const pts = r.points ?? 0;
    const reb = r.rebounds ?? 0;
    const ast = r.assists ?? 0;
    const thr = r.threesMade ?? 0;
    const stl = r.steals ?? 0;
    const blk = r.blocks ?? 0;
    const tov = r.turnovers;
    const date = r.gameDate;

    if (pts >= 10) stamps.push({ id: "double_digits", earnedAt: date });
    if (reb >= 5)  stamps.push({ id: "glass_work",    earnedAt: date });
    if (ast >= 4)  stamps.push({ id: "goggles",       earnedAt: date });
    if (pts >= 25) stamps.push({ id: "wet",           earnedAt: date });
    if (thr >= 3)  stamps.push({ id: "the_distance",  earnedAt: date });
    if (pts >= 1 && ast >= 1 && reb >= 1) stamps.push({ id: "full_send", earnedAt: date });

    const doubleDigits = [pts >= 10, reb >= 10, ast >= 10].filter(Boolean).length;
    if (doubleDigits >= 2) stamps.push({ id: "the_double", earnedAt: date });
    if (pts >= 10 && reb >= 10 && ast >= 10) stamps.push({ id: "full_flood", earnedAt: date });

    if (stl >= 2) stamps.push({ id: "lifted",    earnedAt: date });
    if (blk >= 2) stamps.push({ id: "not_today", earnedAt: date });
    if (tov !== null && tov === 0) stamps.push({ id: "sure_hands", earnedAt: date });
  }

  stamps.sort((a, b) => a.earnedAt.localeCompare(b.earnedAt));

  // ── Battle Tested: 4+ career wins ──────────────────────────────────────
  const winRows = rows.filter((r) => {
    const { homeScore, awayScore, homeTeamId, awayTeamId, teamId } = r;
    if (homeScore == null || awayScore == null) return false;
    if (homeTeamId === teamId) return homeScore > awayScore;
    if (awayTeamId === teamId) return awayScore > homeScore;
    return false;
  });
  if (winRows.length >= 4) {
    const sorted = [...winRows].sort((a, b) => a.gameDate.localeCompare(b.gameDate));
    stamps.push({ id: "battle_tested", earnedAt: sorted[3].gameDate });
  }

  return stamps;
}

async function main() {
  const client = await pool.connect();
  try {
    const playersRes = await client.query<{
      playerId: number;
      firstName: string;
      lastName: string;
      teamId: number;
    }>(`
      SELECT id AS "playerId", first_name AS "firstName", last_name AS "lastName", team_id AS "teamId"
      FROM players
    `);

    let updated = 0;
    let skipped = 0;

    for (const player of playersRes.rows) {
      const profileRes = await client.query<{ id: number }>(
        `SELECT id FROM user_profiles
         WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)
         LIMIT 1`,
        [player.firstName, player.lastName]
      );

      if (profileRes.rows.length === 0) {
        skipped++;
        continue;
      }

      const profileId = profileRes.rows[0].id;

      const statsRes = await client.query<GameStatRow>(
        `SELECT
           g.game_date    AS "gameDate",
           g.home_team_id AS "homeTeamId",
           g.away_team_id AS "awayTeamId",
           g.home_score   AS "homeScore",
           g.away_score   AS "awayScore",
           p.team_id      AS "teamId",
           gps.points,
           gps.rebounds,
           gps.assists,
           gps.threes_made  AS "threesMade",
           gps.steals,
           gps.blocks,
           gps.turnovers
         FROM game_player_stats gps
         JOIN games   g ON g.id = gps.game_id
         JOIN players p ON p.id = gps.player_id
         WHERE gps.player_id = $1`,
        [player.playerId]
      );

      const stamps = computeStamps(statsRes.rows);
      const hasBattleTested = stamps.some((s) => s.id === "battle_tested");

      await client.query(
        `UPDATE user_profiles SET stamps = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(stamps), profileId]
      );

      updated++;
      const btTag = hasBattleTested ? " 🏆 Battle Tested" : "";
      console.log(`✓ ${player.firstName} ${player.lastName}: ${stamps.length} stamps${btTag}`);
    }

    console.log(`\nDone. Updated: ${updated}, Skipped (no profile): ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
