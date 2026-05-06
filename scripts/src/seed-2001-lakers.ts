/**
 * Seed script: delete Surge/Lynx test data, insert 2001 Lakers playoff data,
 * create 40 user profiles, and run full recognition (stamps, milestones,
 * tides, archetypes).
 *
 * Run: pnpm --filter @workspace/scripts run seed-2001-lakers
 */
import pg from "pg";

const DB_URL =
  process.env.RAILWAY_DB_URL ??
  "postgresql://postgres:dlQosuUfRaioPgyIzfQLJipwKRwXKZfb@switchyard.proxy.rlwy.net:18663/railway";

const pool = new pg.Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

const SEASON = "2001 Playoffs";
const TODAY = new Date().toISOString().split("T")[0];

// ── Player stats (applied identically to every game the player's team played) ─
interface PlayerDef {
  firstName: string;
  lastName:  string;
  position:  string;
  number:    number;
  pts: number; reb: number; ast: number;
  stl: number; blk: number; to: number; threes: number;
}

const LAKERS: PlayerDef[] = [
  { firstName:"Shaquille", lastName:"O'Neal",    position:"C", number:34, pts:30,reb:15,ast:3,stl:1,blk:3,to:3,threes:0 },
  { firstName:"Kobe",      lastName:"Bryant",     position:"G", number:8,  pts:29,reb:7, ast:6,stl:1,blk:1,to:3,threes:0 },
  { firstName:"Derek",     lastName:"Fisher",     position:"G", number:2,  pts:8, reb:3, ast:4,stl:1,blk:0,to:2,threes:0 },
  { firstName:"Rick",      lastName:"Fox",        position:"F", number:17, pts:9, reb:4, ast:2,stl:1,blk:0,to:1,threes:0 },
  { firstName:"Robert",    lastName:"Horry",      position:"F", number:5,  pts:7, reb:6, ast:2,stl:1,blk:1,to:1,threes:0 },
  { firstName:"Horace",    lastName:"Grant",      position:"F", number:54, pts:5, reb:5, ast:1,stl:1,blk:1,to:1,threes:0 },
  { firstName:"Brian",     lastName:"Shaw",       position:"G", number:14, pts:6, reb:3, ast:3,stl:0,blk:0,to:2,threes:0 },
  { firstName:"Ron",       lastName:"Harper",     position:"G", number:9,  pts:4, reb:2, ast:1,stl:1,blk:0,to:1,threes:0 },
];
const BLAZERS: PlayerDef[] = [
  { firstName:"Scottie",   lastName:"Pippen",     position:"F", number:33, pts:14,reb:7, ast:6,stl:2,blk:1,to:3,threes:0 },
  { firstName:"Rasheed",   lastName:"Wallace",    position:"F", number:30, pts:16,reb:8, ast:2,stl:1,blk:1,to:3,threes:0 },
  { firstName:"Bonzi",     lastName:"Wells",      position:"G", number:0,  pts:13,reb:4, ast:2,stl:1,blk:0,to:2,threes:0 },
  { firstName:"Damon",     lastName:"Stoudamire", position:"G", number:3,  pts:12,reb:3, ast:5,stl:1,blk:0,to:3,threes:0 },
  { firstName:"Dale",      lastName:"Davis",      position:"C", number:32, pts:6, reb:8, ast:1,stl:1,blk:1,to:2,threes:0 },
  { firstName:"Arvydas",   lastName:"Sabonis",    position:"C", number:11, pts:10,reb:7, ast:3,stl:0,blk:1,to:2,threes:0 },
  { firstName:"Steve",     lastName:"Smith",      position:"G", number:1,  pts:8, reb:3, ast:2,stl:1,blk:0,to:1,threes:0 },
  { firstName:"Detlef",    lastName:"Schrempf",   position:"F", number:15, pts:5, reb:3, ast:2,stl:0,blk:0,to:1,threes:0 },
];
const KINGS: PlayerDef[] = [
  { firstName:"Chris",     lastName:"Webber",     position:"F", number:4,  pts:22,reb:10,ast:4,stl:1,blk:1,to:3,threes:0 },
  { firstName:"Vlade",     lastName:"Divac",      position:"C", number:21, pts:9, reb:8, ast:4,stl:0,blk:1,to:2,threes:0 },
  { firstName:"Peja",      lastName:"Stojakovic",  position:"F", number:16, pts:18,reb:5, ast:2,stl:0,blk:0,to:1,threes:2 },
  { firstName:"Mike",      lastName:"Bibby",      position:"G", number:10, pts:14,reb:3, ast:5,stl:1,blk:0,to:3,threes:0 },
  { firstName:"Jason",     lastName:"Williams",   position:"G", number:55, pts:10,reb:2, ast:6,stl:1,blk:0,to:4,threes:0 },
  { firstName:"Lawrence",  lastName:"Funderburke",position:"F", number:42, pts:6, reb:5, ast:1,stl:0,blk:0,to:1,threes:0 },
  { firstName:"Bobby",     lastName:"Jackson",    position:"G", number:24, pts:9, reb:3, ast:3,stl:1,blk:0,to:2,threes:0 },
  { firstName:"Hedo",      lastName:"Turkoglu",   position:"F", number:5,  pts:5, reb:3, ast:1,stl:0,blk:0,to:1,threes:1 },
];
const SPURS: PlayerDef[] = [
  { firstName:"Tim",       lastName:"Duncan",     position:"F", number:21, pts:24,reb:12,ast:3,stl:1,blk:3,to:3,threes:0 },
  { firstName:"David",     lastName:"Robinson",   position:"C", number:50, pts:10,reb:9, ast:2,stl:1,blk:2,to:2,threes:0 },
  { firstName:"Tony",      lastName:"Parker",     position:"G", number:9,  pts:9, reb:3, ast:4,stl:1,blk:0,to:3,threes:0 },
  { firstName:"Avery",     lastName:"Johnson",    position:"G", number:6,  pts:11,reb:2, ast:5,stl:2,blk:0,to:3,threes:0 },
  { firstName:"Derek",     lastName:"Anderson",   position:"G", number:1,  pts:12,reb:3, ast:2,stl:1,blk:0,to:2,threes:1 },
  { firstName:"Terry",     lastName:"Porter",     position:"G", number:30, pts:7, reb:2, ast:3,stl:1,blk:0,to:1,threes:1 },
  { firstName:"Antonio",   lastName:"Daniels",    position:"G", number:4,  pts:6, reb:2, ast:2,stl:0,blk:0,to:1,threes:0 },
  { firstName:"Jaren",     lastName:"Jackson",    position:"G", number:41, pts:5, reb:2, ast:1,stl:0,blk:0,to:1,threes:1 },
];
const SIXERS: PlayerDef[] = [
  { firstName:"Allen",     lastName:"Iverson",    position:"G", number:3,  pts:35,reb:5, ast:5,stl:2,blk:0,to:4,threes:0 },
  { firstName:"Dikembe",   lastName:"Mutombo",    position:"C", number:55, pts:10,reb:12,ast:1,stl:1,blk:4,to:2,threes:0 },
  { firstName:"Eric",      lastName:"Snow",       position:"G", number:12, pts:8, reb:3, ast:5,stl:1,blk:0,to:2,threes:0 },
  { firstName:"Aaron",     lastName:"McKie",      position:"G", number:8,  pts:9, reb:4, ast:3,stl:1,blk:0,to:1,threes:1 },
  { firstName:"Theo",      lastName:"Ratliff",    position:"C", number:42, pts:5, reb:5, ast:0,stl:0,blk:2,to:1,threes:0 },
  { firstName:"Tyrone",    lastName:"Hill",       position:"F", number:52, pts:5, reb:6, ast:1,stl:0,blk:0,to:1,threes:0 },
  { firstName:"George",    lastName:"Lynch",      position:"F", number:34, pts:4, reb:4, ast:1,stl:1,blk:0,to:1,threes:0 },
  { firstName:"Raja",      lastName:"Bell",       position:"G", number:5,  pts:5, reb:2, ast:1,stl:0,blk:0,to:1,threes:1 },
];

// ── Game definitions ──────────────────────────────────────────────────────────
interface GameDef {
  date: string;
  lkScore: number;
  oppScore: number;
  oppKey: string; // "blazers"|"kings"|"spurs"|"sixers"
  notes: string;
}

const GAMES: GameDef[] = [
  // R1 – Lakers vs Trail Blazers
  { date:"2001-04-21", lkScore:106, oppScore:93,  oppKey:"blazers", notes:"R1 G1" },
  { date:"2001-04-24", lkScore:106, oppScore:88,  oppKey:"blazers", notes:"R1 G2" },
  { date:"2001-04-29", lkScore:99,  oppScore:86,  oppKey:"blazers", notes:"R1 G3" },
  // R2 – Lakers vs Kings
  { date:"2001-05-06", lkScore:108, oppScore:105, oppKey:"kings",   notes:"R2 G1" },
  { date:"2001-05-08", lkScore:96,  oppScore:90,  oppKey:"kings",   notes:"R2 G2" },
  { date:"2001-05-11", lkScore:103, oppScore:81,  oppKey:"kings",   notes:"R2 G3" },
  { date:"2001-05-13", lkScore:119, oppScore:113, oppKey:"kings",   notes:"R2 G4" },
  // CF – Lakers vs Spurs
  { date:"2001-05-19", lkScore:104, oppScore:90,  oppKey:"spurs",   notes:"CF G1" },
  { date:"2001-05-21", lkScore:88,  oppScore:81,  oppKey:"spurs",   notes:"CF G2" },
  { date:"2001-05-25", lkScore:111, oppScore:72,  oppKey:"spurs",   notes:"CF G3" },
  { date:"2001-05-27", lkScore:111, oppScore:82,  oppKey:"spurs",   notes:"CF G4" },
  // Finals – Lakers vs 76ers
  { date:"2001-06-06", lkScore:101, oppScore:107, oppKey:"sixers",  notes:"Finals G1 OT" },
  { date:"2001-06-08", lkScore:98,  oppScore:89,  oppKey:"sixers",  notes:"Finals G2" },
  { date:"2001-06-10", lkScore:96,  oppScore:91,  oppKey:"sixers",  notes:"Finals G3" },
  { date:"2001-06-13", lkScore:100, oppScore:86,  oppKey:"sixers",  notes:"Finals G4" },
  { date:"2001-06-15", lkScore:108, oppScore:96,  oppKey:"sixers",  notes:"Finals G5" },
];

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length);
}
function halfImprovement(len: number, val: number): number {
  // All values are equal so improvement is always 0 (fixed per-game stats)
  return 0;
}

async function main() {
  const client = await pool.connect();
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 1: Delete The Surge (id=1) and The Lynx (id=2)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 1: Deleting The Surge / The Lynx data ─────────────────");

    // Get player IDs for teams 1 and 2
    const surgeOrLynxPlayers = await client.query<{id:number}>(
      `SELECT id FROM players WHERE team_id IN (1, 2)`
    );
    const surgeOrLynxPlayerIds = surgeOrLynxPlayers.rows.map(r => r.id);

    // Get game IDs for teams 1 and 2
    const surgeOrLynxGames = await client.query<{id:number}>(
      `SELECT id FROM games WHERE home_team_id IN (1, 2) OR away_team_id IN (1, 2)`
    );
    const surgeOrLynxGameIds = surgeOrLynxGames.rows.map(r => r.id);

    if (surgeOrLynxPlayerIds.length > 0) {
      await client.query(
        `DELETE FROM game_player_stats WHERE player_id = ANY($1)`,
        [surgeOrLynxPlayerIds]
      );
      console.log(`  Deleted stats for ${surgeOrLynxPlayerIds.length} Surge/Lynx players`);
    }
    if (surgeOrLynxGameIds.length > 0) {
      await client.query(
        `DELETE FROM game_player_stats WHERE game_id = ANY($1)`,
        [surgeOrLynxGameIds]
      );
      await client.query(
        `DELETE FROM games WHERE id = ANY($1)`,
        [surgeOrLynxGameIds]
      );
      console.log(`  Deleted ${surgeOrLynxGameIds.length} Surge/Lynx games`);
    }
    await client.query(`DELETE FROM players WHERE team_id IN (1, 2)`);
    await client.query(`DELETE FROM user_profiles WHERE team_id IN (1, 2)`);
    await client.query(`DELETE FROM teams WHERE id IN (1, 2)`);
    console.log("  Deleted The Surge and The Lynx teams and all associated records.");

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2: Create 5 NBA teams
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 2: Creating 5 teams ────────────────────────────────────");
    const teamDefs = [
      { key:"lakers",  name:"Los Angeles Lakers",      city:"Los Angeles",  abbr:"LAL" },
      { key:"blazers", name:"Portland Trail Blazers",  city:"Portland",     abbr:"POR" },
      { key:"kings",   name:"Sacramento Kings",        city:"Sacramento",   abbr:"SAC" },
      { key:"spurs",   name:"San Antonio Spurs",       city:"San Antonio",  abbr:"SAS" },
      { key:"sixers",  name:"Philadelphia 76ers",      city:"Philadelphia", abbr:"PHI" },
    ];
    const teamIds: Record<string, number> = {};
    const teamKeys = ["lakers","blazers","kings","spurs","sixers"];

    for (const t of teamDefs) {
      const res = await client.query<{id:number}>(
        `INSERT INTO teams (name, city, abbreviation) VALUES ($1, $2, $3) RETURNING id`,
        [t.name, t.city, t.abbr]
      );
      teamIds[t.key] = res.rows[0].id;
      console.log(`  ${t.name}: id=${res.rows[0].id}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 3: Create 40 players (8 per team)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 3: Creating 40 players ─────────────────────────────────");
    const allGroups: { key: string; players: PlayerDef[] }[] = [
      { key:"lakers",  players: LAKERS  },
      { key:"blazers", players: BLAZERS },
      { key:"kings",   players: KINGS   },
      { key:"spurs",   players: SPURS   },
      { key:"sixers",  players: SIXERS  },
    ];

    // Map: "FirstName|LastName" → DB player ID
    const playerDbIds = new Map<string, number>();

    for (const { key, players } of allGroups) {
      const tid = teamIds[key];
      for (const p of players) {
        const res = await client.query<{id:number}>(
          `INSERT INTO players (first_name, last_name, number, position, team_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [p.firstName, p.lastName, p.number, p.position, tid]
        );
        playerDbIds.set(`${p.firstName}|${p.lastName}`, res.rows[0].id);
      }
      console.log(`  Inserted ${players.length} ${teamNames[teamKeys.indexOf(key)]} players`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: Create 15 games
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 4: Creating 15 games ───────────────────────────────────");
    const gameDbIds: number[] = [];

    for (const g of GAMES) {
      const oppId = teamIds[g.oppKey];
      const res = await client.query<{id:number}>(
        `INSERT INTO games (home_team_id, away_team_id, home_score, away_score,
                            game_date, season, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'final', $7) RETURNING id`,
        [teamIds.lakers, oppId, g.lkScore, g.oppScore, g.date, SEASON, g.notes]
      );
      gameDbIds.push(res.rows[0].id);
      console.log(`  Game ${g.notes} (${g.date}) → id=${res.rows[0].id}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 5: Create per-game stats
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 5: Inserting per-game stats ────────────────────────────");

    // Which game indices each team participates in
    const teamGameIndices: Record<string, number[]> = {
      lakers:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
      blazers: [0,1,2],
      kings:   [3,4,5,6],
      spurs:   [7,8,9,10],
      sixers:  [11,12,13,14],
    };

    let statRowCount = 0;
    for (const { key, players } of allGroups) {
      const indices = teamGameIndices[key];
      for (const p of players) {
        const pid = playerDbIds.get(`${p.firstName}|${p.lastName}`)!;
        for (const gi of indices) {
          const gid = gameDbIds[gi];
          await client.query(
            `INSERT INTO game_player_stats
               (game_id, player_id, points, rebounds, assists, steals, blocks,
                turnovers, threes_made, threes_attempted,
                field_goals_made, field_goals_attempted,
                free_throws_made, free_throws_attempted, minutes_played)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
            [gid, pid, p.pts, p.reb, p.ast, p.stl, p.blk, p.to,
             p.threes, p.threes > 0 ? p.threes + 1 : 0,
             0, 0, 0, 0, 30]
          );
          statRowCount++;
        }
      }
    }
    console.log(`  Inserted ${statRowCount} stat rows.`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 6: Create 40 user profiles
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 6: Creating 40 user profiles ───────────────────────────");
    const profileDbIds = new Map<string, number>(); // "First|Last" → profile id

    for (const { key, players } of allGroups) {
      const tid = teamIds[key];
      for (const p of players) {
        const clerkId = `nba2001_${p.firstName.toLowerCase().replace(/[^a-z]/g,"")}${p.lastName.toLowerCase().replace(/[^a-z]/g,"")}`;
        const res = await client.query<{id:number}>(
          `INSERT INTO user_profiles
             (clerk_user_id, first_name, last_name, position, team_id,
              role, is_admin, stamps, tides, milestones, archetype,
              career_stats, archetype_history, verified)
           VALUES ($1,$2,$3,$4,$5,'player',false,'[]','[]','[]','Uncharted','{}','[]',false)
           ON CONFLICT (clerk_user_id) DO UPDATE
             SET first_name=$2, last_name=$3, position=$4, team_id=$5,
                 stamps='[]', tides='[]', milestones='[]', archetype='Uncharted',
                 archetype_history='[]'
           RETURNING id`,
          [clerkId, p.firstName, p.lastName, p.position, tid]
        );
        profileDbIds.set(`${p.firstName}|${p.lastName}`, res.rows[0].id);
      }
    }
    console.log(`  Created ${profileDbIds.size} user profiles.`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 7: Recognition — stamps, milestones
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 7: Computing stamps & milestones ────────────────────────");

    for (const { key, players } of allGroups) {
      const indices = teamGameIndices[key];
      const gamesCount = indices.length;

      for (const p of players) {
        const profId = profileDbIds.get(`${p.firstName}|${p.lastName}`);
        if (!profId) continue;

        const stamps: { id: string; earnedAt: string }[] = [];

        // Each game generates the same stats — deduplicated by first earned date
        const firstGameDate = GAMES[indices[0]].date;
        const gameStats = { points: p.pts, rebounds: p.reb, assists: p.ast,
                            steals: p.stl, blocks: p.blk, turnovers: p.to,
                            threesMade: p.threes };

        const STAMP_CHECKS = [
          { id: "double_digits", passes: () => gameStats.points >= 10 },
          { id: "glass_work",    passes: () => gameStats.rebounds >= 5 },
          { id: "goggles",       passes: () => gameStats.assists >= 4 },
          { id: "wet",           passes: () => gameStats.points >= 25 },
          { id: "the_distance",  passes: () => gameStats.threesMade >= 3 },
          { id: "full_send",     passes: () => gameStats.points >= 1 && gameStats.rebounds >= 1 && gameStats.assists >= 1 },
          { id: "the_double",    passes: () =>
              (gameStats.points >= 10 && gameStats.rebounds >= 10) ||
              (gameStats.points >= 10 && gameStats.assists >= 10) ||
              (gameStats.rebounds >= 10 && gameStats.assists >= 10) },
          { id: "full_flood",    passes: () => gameStats.points >= 10 && gameStats.rebounds >= 10 && gameStats.assists >= 10 },
          { id: "lifted",        passes: () => gameStats.steals >= 2 },
          { id: "not_today",     passes: () => gameStats.blocks >= 2 },
          { id: "sure_hands",    passes: () => gameStats.turnovers === 0 },
        ];

        // Each stamp earned if it fires in any game — store earnedAt as first game date
        for (const { id, passes } of STAMP_CHECKS) {
          if (passes()) {
            for (let gi = 0; gi < gamesCount; gi++) {
              stamps.push({ id, earnedAt: GAMES[indices[gi]].date });
            }
          }
        }
        stamps.sort((a, b) => a.earnedAt.localeCompare(b.earnedAt));

        // Milestones
        const totalPts  = p.pts  * gamesCount;
        const totalReb  = p.reb  * gamesCount;
        const totalAst  = p.ast  * gamesCount;
        const totalStl  = p.stl  * gamesCount;
        const totalBlk  = p.blk  * gamesCount;
        const totalThrees = p.threes * gamesCount;

        const MILESTONES = [
          { id:"pts_100",   val: totalPts,    threshold: 100  },
          { id:"pts_250",   val: totalPts,    threshold: 250  },
          { id:"pts_500",   val: totalPts,    threshold: 500  },
          { id:"pts_1000",  val: totalPts,    threshold: 1000 },
          { id:"reb_50",    val: totalReb,    threshold: 50   },
          { id:"reb_100",   val: totalReb,    threshold: 100  },
          { id:"ast_50",    val: totalAst,    threshold: 50   },
          { id:"ast_100",   val: totalAst,    threshold: 100  },
          { id:"three_50",  val: totalThrees, threshold: 50   },
          { id:"stl_50",    val: totalStl,    threshold: 50   },
          { id:"blk_50",    val: totalBlk,    threshold: 50   },
        ];

        const milestones: { id: string; earnedAt: string }[] = [];
        for (const m of MILESTONES) {
          if (m.val >= m.threshold) milestones.push({ id: m.id, earnedAt: TODAY });
        }

        await client.query(
          `UPDATE user_profiles SET stamps=$1, milestones=$2, updated_at=NOW() WHERE id=$3`,
          [JSON.stringify(stamps), JSON.stringify(milestones), profId]
        );
      }
    }
    console.log("  Stamps and milestones written.");

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 8: Recognition — tides (league-wide for the season)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 8: Computing tides ─────────────────────────────────────");

    interface Metrics {
      firstName: string; lastName: string;
      totalPoints: number; totalRebounds: number; totalAssists: number;
      totalSteals: number; totalBlocks: number;
      avgPoints: number; highestGamePoints: number; stdDevPoints: number;
      improvement: number; composite: number; gamesPlayed: number;
      avgTurnovers: number;
    }

    const allMetrics: Metrics[] = [];
    for (const { key, players } of allGroups) {
      const gamesCount = teamGameIndices[key].length;
      for (const p of players) {
        const pts = Array(gamesCount).fill(p.pts);
        allMetrics.push({
          firstName:       p.firstName,
          lastName:        p.lastName,
          totalPoints:     p.pts   * gamesCount,
          totalRebounds:   p.reb   * gamesCount,
          totalAssists:    p.ast   * gamesCount,
          totalSteals:     p.stl   * gamesCount,
          totalBlocks:     p.blk   * gamesCount,
          avgPoints:       p.pts,
          highestGamePoints: p.pts,
          stdDevPoints:    stdDev(pts), // = 0 for fixed stats
          improvement:     0,
          composite:       p.pts + p.reb + p.ast,
          gamesPlayed:     gamesCount,
          avgTurnovers:    p.to,
        });
      }
    }

    function topOf(
      key: (m: Metrics) => number,
      filter?: (m: Metrics) => boolean
    ): Metrics | null {
      const pool2 = filter ? allMetrics.filter(filter) : allMetrics;
      if (pool2.length === 0) return null;
      return pool2.reduce((best, m) => (key(m) > key(best) ? m : best));
    }

    const AUTO_TIDE_IDS = [
      "high_tide","the_keeper","the_source","the_swell","lighthouse",
      "rising_tide","shoreline","the_crest","rip_tide","the_wall",
      "all_tide","dead_calm",
    ];

    const winners: Record<string, Metrics | null> = {
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
      dead_calm:   topOf((m) => -m.avgTurnovers, (m) => m.gamesPlayed >= 5),
    };

    console.log("  Tide winners:");
    for (const [tid, w] of Object.entries(winners)) {
      if (w) console.log(`    ${tid}: ${w.firstName} ${w.lastName}`);
    }

    // Write tides to each profile
    for (const { key, players } of allGroups) {
      for (const p of players) {
        const profId = profileDbIds.get(`${p.firstName}|${p.lastName}`);
        if (!profId) continue;

        const gained: { id: string; earnedAt: string }[] = [];
        for (const [tideId, winner] of Object.entries(winners)) {
          if (winner && winner.firstName === p.firstName && winner.lastName === p.lastName) {
            gained.push({ id: tideId, earnedAt: TODAY });
          }
        }
        if (gained.length > 0) {
          await client.query(
            `UPDATE user_profiles SET tides=$1, updated_at=NOW() WHERE id=$2`,
            [JSON.stringify(gained), profId]
          );
        }
      }
    }
    console.log("  Tides written.");

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 9: Recognition — archetypes (per team)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n── Phase 9: Computing archetypes ────────────────────────────────");

    function isHighest(val: number, max: number): boolean {
      return Math.abs(val - max) <= 1e-10;
    }

    for (const { key, players } of allGroups) {
      const gamesCount = teamGameIndices[key].length;
      if (gamesCount === 0) continue;

      const avgs = players.map(p => ({
        firstName:   p.firstName,
        lastName:    p.lastName,
        avgPoints:   p.pts,
        avgRebounds: p.reb,
        avgAssists:  p.ast,
        avgSteals:   p.stl,
        avgBlocks:   p.blk,
        avgThrees:   p.threes,
      }));

      const assignments = new Map<string, string>();

      if (avgs.length === 1) {
        const p  = avgs[0];
        const sc = p.avgPoints   * 10;
        const rb = p.avgRebounds * 15;
        const pl = p.avgAssists  * 20;
        const st = p.avgSteals   * 35;
        const bl = p.avgBlocks   * 35;
        const th = p.avgThrees   * 40;
        let archetype: string;
        if      (sc >= 180)                              archetype = "The Mainstay";
        else if (sc >= 150 && (rb > 90 || pl > 80))     archetype = "The Engine";
        else if (th >= 80 && p.avgThrees >= 2)           archetype = "The Deep";
        else if (rb >= 90)                               archetype = "The Vortex";
        else if (pl >= 100)                              archetype = "The Current";
        else if (st >= 70)                               archetype = "The Warden";
        else if (bl >= 52)                               archetype = "The Wall";
        else {
          const cats = [
            { id:"The Mainstay", score:sc },
            { id:"The Deep",     score:th },
            { id:"The Vortex",   score:rb },
            { id:"The Current",  score:pl },
            { id:"The Warden",   score:st },
            { id:"The Wall",     score:bl },
          ];
          const best = cats.reduce((a, b) => b.score > a.score ? b : a);
          archetype = best.score > 0 ? best.id : "The Climb";
        }
        assignments.set(`${p.firstName}|${p.lastName}`, archetype);

      } else {
        const teamMaxReb    = Math.max(...avgs.map(a => a.avgRebounds * 15));
        const teamMaxPl     = Math.max(...avgs.map(a => a.avgAssists  * 20));
        const teamMaxSt     = Math.max(...avgs.map(a => a.avgSteals   * 35));
        const teamMaxBl     = Math.max(...avgs.map(a => a.avgBlocks   * 35));
        const teamMaxThrees = Math.max(...avgs.map(a => a.avgThrees   * 40));
        const topScorer     = avgs.reduce((best, p) => p.avgPoints > best.avgPoints ? p : best);
        const topScorerKey  = `${topScorer.firstName}|${topScorer.lastName}`;

        for (const p of avgs) {
          const k  = `${p.firstName}|${p.lastName}`;
          const sc = p.avgPoints   * 10;
          const rb = p.avgRebounds * 15;
          const pl = p.avgAssists  * 20;
          const st = p.avgSteals   * 35;
          const bl = p.avgBlocks   * 35;
          const th = p.avgThrees   * 40;
          const isTop = k === topScorerKey;
          let archetype: string;
          if      (sc >= 180 && isTop)                                         archetype = "The Mainstay";
          else if (sc >= 180)                                                   archetype = "The Voltage";
          else if (sc >= 150 && sc < 180 && (rb > 90 || pl > 80))              archetype = "The Engine";
          else if (isHighest(th, teamMaxThrees) && th >= 80 && p.avgThrees >= 2) archetype = "The Deep";
          else if (isHighest(rb, teamMaxReb)    && rb >= 90)                    archetype = "The Vortex";
          else if (isHighest(pl, teamMaxPl)     && pl >= 100)                   archetype = "The Current";
          else if (isHighest(st, teamMaxSt)     && st >= 70)                    archetype = "The Warden";
          else if (isHighest(bl, teamMaxBl)     && bl >= 52)                    archetype = "The Wall";
          else                                                                   archetype = "The Climb";
          assignments.set(k, archetype);
        }
      }

      // Persist
      for (const p of players) {
        const k = `${p.firstName}|${p.lastName}`;
        const archetype = assignments.get(k) ?? "Uncharted";
        const profId = profileDbIds.get(k);
        if (!profId) continue;
        await client.query(
          `UPDATE user_profiles SET archetype=$1, updated_at=NOW() WHERE id=$2`,
          [archetype, profId]
        );
        console.log(`  ${p.firstName} ${p.lastName} (${teamNames[teamKeys.indexOf(key)]}) → ${archetype}`);
      }
    }

    console.log("\n✓ All done! Summary:");
    console.log("  5 teams created");
    console.log("  40 players created");
    console.log("  15 games created");
    console.log(`  ${statRowCount} stat rows inserted`);
    console.log("  40 user profiles created with stamps, milestones, tides, archetypes");

  } finally {
    client.release();
    await pool.end();
  }
}

const teamNames = [
  "Los Angeles Lakers",
  "Portland Trail Blazers",
  "Sacramento Kings",
  "San Antonio Spurs",
  "Philadelphia 76ers",
];
const teamKeys = ["lakers","blazers","kings","spurs","sixers"];

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
