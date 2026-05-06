/**
 * Recalculate archetypes for all players against the Railway database.
 * Uses the correct schema join:
 *   game_player_stats.player_id → players (name, team_id)
 *   game_player_stats.game_id  → games (season)
 *   user_profiles matched by first_name + last_name + team_id
 *
 * Run: pnpm --filter @workspace/scripts run recalc-archetypes
 */
import pg from "pg";

const DB_URL =
  process.env.RAILWAY_DB_URL ??
  "postgresql://postgres:dlQosuUfRaioPgyIzfQLJipwKRwXKZfb@switchyard.proxy.rlwy.net:18663/railway";

const pool = new pg.Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function isHighest(val: number, max: number): boolean {
  return Math.abs(val - max) <= 1e-10;
}

interface GameRow {
  firstName: string;
  lastName: string;
  teamId: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  threesMade: number;
}

async function main() {
  const client = await pool.connect();
  try {
    // ── 1. Find the current season (most recent in games table) ───────────────
    const seasonRes = await client.query<{ season: string }>(
      `SELECT season FROM games WHERE season IS NOT NULL
       GROUP BY season ORDER BY MAX(game_date) DESC LIMIT 1`
    );
    const season: string | null = seasonRes.rows[0]?.season ?? null;
    console.log(`Current season: ${season ?? "(none — using all stats)"}`);

    // ── 2. Load per-game stats joined to players + games ──────────────────────
    const statsQuery = season
      ? `SELECT p.first_name AS "firstName", p.last_name AS "lastName",
                p.team_id   AS "teamId",
                gps.points, gps.rebounds, gps.assists, gps.steals, gps.blocks,
                gps.threes_made AS "threesMade"
         FROM game_player_stats gps
         JOIN players p ON p.id = gps.player_id
         JOIN games   g ON g.id = gps.game_id
         WHERE g.season = $1 AND p.team_id IS NOT NULL`
      : `SELECT p.first_name AS "firstName", p.last_name AS "lastName",
                p.team_id   AS "teamId",
                gps.points, gps.rebounds, gps.assists, gps.steals, gps.blocks,
                gps.threes_made AS "threesMade"
         FROM game_player_stats gps
         JOIN players p ON p.id = gps.player_id
         WHERE p.team_id IS NOT NULL`;

    const statsRes = await client.query<GameRow>(statsQuery, season ? [season] : []);
    console.log(`Loaded ${statsRes.rows.length} game-stat rows.`);

    // ── 3. Group game rows by player key (firstName|lastName|teamId) ──────────
    type PlayerKey = string;
    const makeKey = (r: { firstName: string; lastName: string; teamId: number }) =>
      `${r.firstName}|${r.lastName}|${r.teamId}`;

    const gamesByPlayer = new Map<PlayerKey, GameRow[]>();
    for (const row of statsRes.rows) {
      const k = makeKey(row);
      const list = gamesByPlayer.get(k) ?? [];
      list.push(row);
      gamesByPlayer.set(k, list);
    }

    // ── 4. Build per-player averages and group by team ────────────────────────
    interface PlayerAvg {
      key: PlayerKey;
      firstName: string;
      lastName: string;
      teamId: number;
      avgPoints: number;
      avgRebounds: number;
      avgAssists: number;
      avgSteals: number;
      avgBlocks: number;
      avgThrees: number;
    }

    const byTeam = new Map<number, PlayerAvg[]>();
    for (const [key, games] of gamesByPlayer) {
      const first = games[0];
      const avg: PlayerAvg = {
        key,
        firstName:   first.firstName,
        lastName:    first.lastName,
        teamId:      first.teamId,
        avgPoints:   mean(games.map((g) => Number(g.points))),
        avgRebounds: mean(games.map((g) => Number(g.rebounds))),
        avgAssists:  mean(games.map((g) => Number(g.assists))),
        avgSteals:   mean(games.map((g) => Number(g.steals))),
        avgBlocks:   mean(games.map((g) => Number(g.blocks))),
        avgThrees:   mean(games.map((g) => Number(g.threesMade))),
      };
      const list = byTeam.get(first.teamId) ?? [];
      list.push(avg);
      byTeam.set(first.teamId, list);
    }

    // ── 5. Assign archetypes ──────────────────────────────────────────────────
    const archetypeByKey = new Map<PlayerKey, string>();

    for (const [, avgs] of byTeam) {
      if (avgs.length === 1) {
        // Solo-player path
        const p  = avgs[0];
        const sc = p.avgPoints   * 10;
        const rb = p.avgRebounds * 15;
        const pl = p.avgAssists  * 20;
        const st = p.avgSteals   * 35;
        const bl = p.avgBlocks   * 35;
        const th = p.avgThrees   * 40;

        let archetype: string;
        if      (sc >= 180)                          archetype = "The Mainstay";
        else if (sc >= 150 && (rb > 90 || pl > 80)) archetype = "The Engine";
        else if (th >= 80 && p.avgThrees >= 2)       archetype = "The Deep";
        else if (rb >= 90)                           archetype = "The Vortex";
        else if (pl >= 100)                          archetype = "The Current";
        else if (st >= 70)                           archetype = "The Warden";
        else if (bl >= 52)                           archetype = "The Wall";
        else {
          const best = [
            { id: "The Mainstay", score: sc },
            { id: "The Deep",     score: th },
            { id: "The Vortex",   score: rb },
            { id: "The Current",  score: pl },
            { id: "The Warden",   score: st },
            { id: "The Wall",     score: bl },
          ].reduce((a, b) => (b.score > a.score ? b : a));
          archetype = best.score > 0 ? best.id : "The Climb";
        }
        archetypeByKey.set(p.key, archetype);
        console.log(`  Solo  team=${p.teamId}: ${p.firstName} ${p.lastName} → ${archetype}`);

      } else {
        // Multi-player team comparison
        const teamMaxReb    = Math.max(...avgs.map((a) => a.avgRebounds * 15));
        const teamMaxPl     = Math.max(...avgs.map((a) => a.avgAssists  * 20));
        const teamMaxSt     = Math.max(...avgs.map((a) => a.avgSteals   * 35));
        const teamMaxBl     = Math.max(...avgs.map((a) => a.avgBlocks   * 35));
        const teamMaxThrees = Math.max(...avgs.map((a) => a.avgThrees   * 40));
        const topScorer     = avgs.reduce((best, p) => (p.avgPoints > best.avgPoints ? p : best));

        for (const p of avgs) {
          const sc = p.avgPoints   * 10;
          const rb = p.avgRebounds * 15;
          const pl = p.avgAssists  * 20;
          const st = p.avgSteals   * 35;
          const bl = p.avgBlocks   * 35;
          const th = p.avgThrees   * 40;
          const isTopScorer = p.key === topScorer.key;

          let archetype: string;
          if      (sc >= 180 && isTopScorer)                                   archetype = "The Mainstay";
          else if (sc >= 180)                                                   archetype = "The Voltage";
          else if (sc >= 150 && sc < 180 && (rb > 90 || pl > 80))              archetype = "The Engine";
          else if (isHighest(th, teamMaxThrees) && th >= 80 && p.avgThrees >= 2) archetype = "The Deep";
          else if (isHighest(rb, teamMaxReb)    && rb >= 90)                    archetype = "The Vortex";
          else if (isHighest(pl, teamMaxPl)     && pl >= 100)                   archetype = "The Current";
          else if (isHighest(st, teamMaxSt)     && st >= 70)                    archetype = "The Warden";
          else if (isHighest(bl, teamMaxBl)     && bl >= 52)                    archetype = "The Wall";
          else                                                                   archetype = "The Climb";

          archetypeByKey.set(p.key, archetype);
          console.log(
            `  Team ${p.teamId}: ${p.firstName} ${p.lastName} → ${archetype}` +
            ` (sc=${sc.toFixed(1)} rb=${rb.toFixed(1)} pl=${pl.toFixed(1)}` +
            ` st=${st.toFixed(1)} bl=${bl.toFixed(1)} th=${th.toFixed(1)})`
          );
        }
      }
    }

    // ── 6. Load all user_profiles and match by first_name + last_name + team_id
    const profileRes = await client.query<{
      clerkUserId: string; firstName: string; lastName: string;
      teamId: number | null; currentArchetype: string | null;
    }>(
      `SELECT clerk_user_id AS "clerkUserId", first_name AS "firstName",
              last_name AS "lastName", team_id AS "teamId",
              archetype AS "currentArchetype"
       FROM user_profiles`
    );

    let changed = 0;
    let unchanged = 0;
    let noStats = 0;

    for (const profile of profileRes.rows) {
      if (profile.teamId == null) { noStats++; continue; }
      const key = `${profile.firstName}|${profile.lastName}|${profile.teamId}`;
      const newArchetype = archetypeByKey.get(key) ?? "Uncharted";

      if (newArchetype === profile.currentArchetype) { unchanged++; continue; }

      await client.query(
        `UPDATE user_profiles SET archetype = $1, updated_at = NOW()
         WHERE clerk_user_id = $2`,
        [newArchetype, profile.clerkUserId]
      );
      console.log(
        `  Updated: ${profile.firstName} ${profile.lastName}` +
        ` — "${profile.currentArchetype}" → "${newArchetype}"`
      );
      changed++;
    }

    console.log(
      `\nDone. ${changed} updated, ${unchanged} unchanged, ${noStats} skipped (no team).`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
