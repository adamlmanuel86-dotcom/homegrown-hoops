/**
 * Seed Team NB 16U games into Railway production DB.
 * - Creates Team NB 16U (if not exists), Manitoba 14U, NFLD 15U
 * - Adds 11 new players to Team NB 16U (Jack M #4 already exists — linked only)
 * - Creates Game 1 (July 11 2026: NB 16U 93 vs Manitoba 14U 57)
 * - Creates Game 2 (July 9 2026: NB 16U 84 vs NFLD 15U 67)
 * - Inserts full per-player box score stats for both games
 *
 * Run: pnpm --filter @workspace/scripts run seed-nb16u-games
 */
import pg from "pg";

const DB_URL =
  process.env.RAILWAY_DB_URL ??
  "postgresql://postgres:dlQosuUfRaioPgyIzfQLJipwKRwXKZfb@switchyard.proxy.rlwy.net:18663/railway";

const pool = new pg.Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function upsertTeam(
  client: pg.PoolClient,
  name: string,
  city: string,
  abbreviation: string,
  primaryColor: string,
  secondaryColor: string,
): Promise<number> {
  const existing = await client.query(
    `SELECT id FROM teams WHERE LOWER(name) = LOWER($1)`,
    [name],
  );
  if (existing.rows.length > 0) {
    console.log(`  Team "${name}" already exists — id=${existing.rows[0].id}`);
    return existing.rows[0].id as number;
  }
  const res = await client.query(
    `INSERT INTO teams (name, city, abbreviation, primary_color, secondary_color)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, city, abbreviation, primaryColor, secondaryColor],
  );
  const id = res.rows[0].id as number;
  console.log(`  Created team "${name}" — id=${id}`);
  return id;
}

async function upsertPlayer(
  client: pg.PoolClient,
  firstName: string,
  lastName: string,
  number: string,
  teamId: number,
): Promise<number> {
  // Check for existing player with same name on the same team
  const existing = await client.query(
    `SELECT id FROM players WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2) AND team_id = $3`,
    [firstName, lastName, teamId],
  );
  if (existing.rows.length > 0) {
    console.log(`  Player "${firstName} ${lastName}" already on team ${teamId} — id=${existing.rows[0].id}`);
    return existing.rows[0].id as number;
  }
  const res = await client.query(
    `INSERT INTO players (first_name, last_name, number, team_id) VALUES ($1, $2, $3, $4) RETURNING id`,
    [firstName, lastName, number, teamId],
  );
  const id = res.rows[0].id as number;
  console.log(`  Created player "${firstName} ${lastName}" #${number} — id=${id}`);
  return id;
}

interface BoxScoreLine {
  firstName: string;
  lastName: string;
  number: string;
  pts: number;
  fgm: number; fga: number;
  tpm: number; tpa: number;
  ftm: number; fta: number;
  orb: number; drb: number; reb: number;
  ast: number; stl: number; blk: number;
  to_: number;
}

async function insertBoxScore(
  client: pg.PoolClient,
  gameId: number,
  playerIdMap: Map<string, number>,
  lines: BoxScoreLine[],
  gameLabel: string,
) {
  for (const line of lines) {
    const key = `${line.firstName}|${line.lastName}`;
    const playerId = playerIdMap.get(key);
    if (!playerId) {
      console.error(`  ERROR: no playerId for "${line.firstName} ${line.lastName}"`);
      continue;
    }
    // Check if stat row already exists
    const existing = await client.query(
      `SELECT id FROM game_player_stats WHERE game_id = $1 AND player_id = $2`,
      [gameId, playerId],
    );
    if (existing.rows.length > 0) {
      console.log(`  ${gameLabel} stat for ${line.firstName} ${line.lastName} already exists — skipping`);
      continue;
    }
    await client.query(
      `INSERT INTO game_player_stats
         (game_id, player_id, points, rebounds, assists, steals, blocks, turnovers,
          field_goals_made, field_goals_attempted, threes_made, threes_attempted,
          free_throws_made, free_throws_attempted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        gameId, playerId,
        line.pts, line.reb, line.ast, line.stl, line.blk, line.to_,
        line.fgm, line.fga, line.tpm, line.tpa, line.ftm, line.fta,
      ],
    );
    console.log(`  ${gameLabel} — inserted stats for ${line.firstName} ${line.lastName}: ${line.pts}pts ${line.reb}reb ${line.ast}ast`);
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("\n=== Step 1: Upsert teams ===");
    const nbTeamId = await upsertTeam(client, "Team NB 16U", "New Brunswick", "NB16", "#00843D", "#FFFFFF");
    const mbTeamId = await upsertTeam(client, "Manitoba 14U", "Manitoba", "MB14", "#1D428A", "#FDB927");
    const nfldTeamId = await upsertTeam(client, "NFLD 15U", "Newfoundland", "NL15", "#006341", "#FFFFFF");

    console.log("\n=== Step 2: Find Jack M (stored as 'Jack Manuel') ===");
    // Jack M is stored in DB as first_name='Jack', last_name='Manuel'
    const jackRes = await client.query(
      `SELECT id, team_id, number FROM players WHERE LOWER(first_name) = 'jack' AND LOWER(last_name) = 'manuel' LIMIT 1`,
    );
    if (jackRes.rows.length === 0) {
      throw new Error("Jack Manuel not found in DB — cannot continue");
    }
    const jackId = jackRes.rows[0].id as number;
    // Update team to NB 16U and set jersey number 4 if not already set
    const needsTeamUpdate = jackRes.rows[0].team_id !== nbTeamId;
    const needsNumberUpdate = jackRes.rows[0].number !== "4";
    if (needsTeamUpdate || needsNumberUpdate) {
      await client.query(
        `UPDATE players SET team_id = $1, number = '4' WHERE id = $2`,
        [nbTeamId, jackId],
      );
      console.log(`  Jack Manuel (id=${jackId}) — updated team_id → ${nbTeamId}, number → 4`);
    } else {
      console.log(`  Jack Manuel (id=${jackId}) — already on NB team with #4 ✓`);
    }

    console.log("\n=== Step 3: Upsert 11 new players on Team NB 16U ===");
    const newPlayers: Array<{ firstName: string; lastName: string; number: string }> = [
      { firstName: "Elliot",   lastName: "S",  number: "5"  },
      { firstName: "Dami",     lastName: "O",  number: "6"  },
      { firstName: "Eli",      lastName: "M",  number: "7"  },
      { firstName: "Soke",     lastName: "G",  number: "8"  },
      { firstName: "Hilary",   lastName: "O",  number: "11" },
      { firstName: "Harrison", lastName: "H",  number: "12" },
      { firstName: "Carson",   lastName: "M",  number: "13" },
      { firstName: "Sawyer",   lastName: "B",  number: "13" }, // both #13 — intentional per source data
      { firstName: "Parker",   lastName: "W",  number: "14" },
      { firstName: "Mathew",   lastName: "HM", number: "15" },
      { firstName: "Logan",    lastName: "S",  number: "21" },
    ];
    const playerIdMap = new Map<string, number>();
    playerIdMap.set("Jack|M", jackId);
    for (const p of newPlayers) {
      const id = await upsertPlayer(client, p.firstName, p.lastName, p.number, nbTeamId);
      playerIdMap.set(`${p.firstName}|${p.lastName}`, id);
    }

    console.log("\n=== Step 4: Upsert games ===");

    // Game 1: July 11 2026 — Team NB 16U (home) 93 vs Manitoba 14U (away) 57
    const game1Check = await client.query(
      `SELECT id FROM games WHERE home_team_id = $1 AND away_team_id = $2 AND game_date::date = '2026-07-11'`,
      [nbTeamId, mbTeamId],
    );
    let game1Id: number;
    if (game1Check.rows.length > 0) {
      game1Id = game1Check.rows[0].id as number;
      console.log(`  Game 1 already exists — id=${game1Id}`);
    } else {
      const g1 = await client.query(
        `INSERT INTO games (home_team_id, away_team_id, home_score, away_score, game_date, season, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [nbTeamId, mbTeamId, 93, 57, "2026-07-11", "2025-26", "final"],
      );
      game1Id = g1.rows[0].id as number;
      console.log(`  Created Game 1 (NB 16U 93 vs MB 14U 57, Jul 11) — id=${game1Id}`);
    }

    // Game 2: July 9 2026 — Team NB 16U (home) 84 vs NFLD 15U (away) 67
    const game2Check = await client.query(
      `SELECT id FROM games WHERE home_team_id = $1 AND away_team_id = $2 AND game_date::date = '2026-07-09'`,
      [nbTeamId, nfldTeamId],
    );
    let game2Id: number;
    if (game2Check.rows.length > 0) {
      game2Id = game2Check.rows[0].id as number;
      console.log(`  Game 2 already exists — id=${game2Id}`);
    } else {
      const g2 = await client.query(
        `INSERT INTO games (home_team_id, away_team_id, home_score, away_score, game_date, season, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [nbTeamId, nfldTeamId, 84, 67, "2026-07-09", "2025-26", "final"],
      );
      game2Id = g2.rows[0].id as number;
      console.log(`  Created Game 2 (NB 16U 84 vs NFLD 15U 67, Jul 9) — id=${game2Id}`);
    }

    console.log("\n=== Step 5: Insert box scores ===");

    const game1Box: BoxScoreLine[] = [
      { firstName: "Jack",     lastName: "M",  number: "4",  pts: 8,  fgm: 3,  fga: 5,  tpm: 2, tpa: 4, ftm: 0, fta: 0, orb: 0, drb: 0, reb: 0,  ast: 3, stl: 2, blk: 0, to_: 1 },
      { firstName: "Elliot",   lastName: "S",  number: "5",  pts: 3,  fgm: 1,  fga: 7,  tpm: 1, tpa: 4, ftm: 0, fta: 0, orb: 1, drb: 1, reb: 2,  ast: 1, stl: 2, blk: 0, to_: 0 },
      { firstName: "Dami",     lastName: "O",  number: "6",  pts: 10, fgm: 4,  fga: 7,  tpm: 0, tpa: 0, ftm: 2, fta: 2, orb: 5, drb: 2, reb: 7,  ast: 3, stl: 3, blk: 1, to_: 2 },
      { firstName: "Eli",      lastName: "M",  number: "7",  pts: 10, fgm: 3,  fga: 5,  tpm: 2, tpa: 3, ftm: 2, fta: 2, orb: 1, drb: 3, reb: 4,  ast: 4, stl: 2, blk: 1, to_: 1 },
      { firstName: "Soke",     lastName: "G",  number: "8",  pts: 12, fgm: 4,  fga: 12, tpm: 0, tpa: 3, ftm: 4, fta: 8, orb: 7, drb: 3, reb: 10, ast: 2, stl: 3, blk: 4, to_: 2 },
      { firstName: "Hilary",   lastName: "O",  number: "11", pts: 6,  fgm: 2,  fga: 5,  tpm: 0, tpa: 2, ftm: 2, fta: 3, orb: 2, drb: 2, reb: 4,  ast: 5, stl: 1, blk: 0, to_: 0 },
      { firstName: "Harrison", lastName: "H",  number: "12", pts: 1,  fgm: 0,  fga: 3,  tpm: 0, tpa: 2, ftm: 1, fta: 2, orb: 4, drb: 4, reb: 8,  ast: 2, stl: 3, blk: 0, to_: 1 },
      { firstName: "Carson",   lastName: "M",  number: "13", pts: 5,  fgm: 1,  fga: 4,  tpm: 1, tpa: 2, ftm: 2, fta: 4, orb: 1, drb: 2, reb: 3,  ast: 0, stl: 0, blk: 0, to_: 1 },
      { firstName: "Sawyer",   lastName: "B",  number: "13", pts: 9,  fgm: 3,  fga: 6,  tpm: 1, tpa: 4, ftm: 2, fta: 2, orb: 1, drb: 0, reb: 1,  ast: 1, stl: 2, blk: 0, to_: 0 },
      { firstName: "Parker",   lastName: "W",  number: "14", pts: 7,  fgm: 3,  fga: 5,  tpm: 0, tpa: 1, ftm: 1, fta: 4, orb: 4, drb: 0, reb: 4,  ast: 2, stl: 0, blk: 1, to_: 1 },
      { firstName: "Mathew",   lastName: "HM", number: "15", pts: 11, fgm: 4,  fga: 14, tpm: 2, tpa: 5, ftm: 1, fta: 2, orb: 3, drb: 2, reb: 5,  ast: 0, stl: 3, blk: 0, to_: 1 },
      { firstName: "Logan",    lastName: "S",  number: "21", pts: 11, fgm: 3,  fga: 10, tpm: 1, tpa: 4, ftm: 4, fta: 8, orb: 3, drb: 1, reb: 4,  ast: 1, stl: 1, blk: 0, to_: 2 },
    ];

    const game2Box: BoxScoreLine[] = [
      { firstName: "Jack",     lastName: "M",  number: "4",  pts: 0,  fgm: 0,  fga: 1,  tpm: 0, tpa: 1, ftm: 0, fta: 0, orb: 0, drb: 1, reb: 1,  ast: 2, stl: 0, blk: 0, to_: 0 },
      { firstName: "Elliot",   lastName: "S",  number: "5",  pts: 11, fgm: 4,  fga: 7,  tpm: 1, tpa: 3, ftm: 2, fta: 2, orb: 0, drb: 3, reb: 3,  ast: 2, stl: 2, blk: 0, to_: 1 },
      { firstName: "Dami",     lastName: "O",  number: "6",  pts: 11, fgm: 5,  fga: 6,  tpm: 0, tpa: 0, ftm: 1, fta: 2, orb: 1, drb: 1, reb: 2,  ast: 1, stl: 1, blk: 0, to_: 0 },
      { firstName: "Eli",      lastName: "M",  number: "7",  pts: 4,  fgm: 2,  fga: 10, tpm: 0, tpa: 4, ftm: 0, fta: 0, orb: 1, drb: 1, reb: 2,  ast: 7, stl: 1, blk: 0, to_: 1 },
      { firstName: "Soke",     lastName: "G",  number: "8",  pts: 10, fgm: 4,  fga: 10, tpm: 1, tpa: 4, ftm: 1, fta: 4, orb: 3, drb: 2, reb: 5,  ast: 1, stl: 3, blk: 1, to_: 0 },
      { firstName: "Hilary",   lastName: "O",  number: "11", pts: 8,  fgm: 2,  fga: 14, tpm: 0, tpa: 3, ftm: 4, fta: 8, orb: 2, drb: 3, reb: 5,  ast: 0, stl: 3, blk: 0, to_: 1 },
      { firstName: "Harrison", lastName: "H",  number: "12", pts: 4,  fgm: 2,  fga: 3,  tpm: 0, tpa: 1, ftm: 0, fta: 2, orb: 0, drb: 4, reb: 4,  ast: 1, stl: 6, blk: 0, to_: 4 },
      { firstName: "Carson",   lastName: "M",  number: "13", pts: 16, fgm: 7,  fga: 16, tpm: 1, tpa: 5, ftm: 1, fta: 2, orb: 4, drb: 3, reb: 7,  ast: 2, stl: 2, blk: 0, to_: 0 },
      { firstName: "Sawyer",   lastName: "B",  number: "13", pts: 0,  fgm: 0,  fga: 3,  tpm: 0, tpa: 3, ftm: 0, fta: 0, orb: 0, drb: 0, reb: 0,  ast: 1, stl: 2, blk: 0, to_: 1 },
      { firstName: "Parker",   lastName: "W",  number: "14", pts: 9,  fgm: 4,  fga: 11, tpm: 1, tpa: 1, ftm: 0, fta: 1, orb: 4, drb: 4, reb: 8,  ast: 0, stl: 0, blk: 1, to_: 0 },
      { firstName: "Mathew",   lastName: "HM", number: "15", pts: 2,  fgm: 0,  fga: 6,  tpm: 0, tpa: 5, ftm: 2, fta: 2, orb: 1, drb: 1, reb: 2,  ast: 2, stl: 3, blk: 0, to_: 2 },
      { firstName: "Logan",    lastName: "S",  number: "21", pts: 9,  fgm: 3,  fga: 6,  tpm: 1, tpa: 3, ftm: 2, fta: 5, orb: 1, drb: 2, reb: 3,  ast: 3, stl: 2, blk: 1, to_: 3 },
    ];

    await insertBoxScore(client, game1Id, playerIdMap, game1Box, "Game1");
    await insertBoxScore(client, game2Id, playerIdMap, game2Box, "Game2");

    console.log("\n=== Done! Summary ===");
    console.log(`  Team NB 16U id: ${nbTeamId}`);
    console.log(`  Manitoba 14U id: ${mbTeamId}`);
    console.log(`  NFLD 15U id: ${nfldTeamId}`);
    console.log(`  Game 1 id: ${game1Id} (NB 16U 93 vs MB 14U 57, Jul 11 2026)`);
    console.log(`  Game 2 id: ${game2Id} (NB 16U 84 vs NFLD 15U 67, Jul 9 2026)`);
    console.log(`  Players seeded: ${playerIdMap.size} (incl. Jack M)`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
