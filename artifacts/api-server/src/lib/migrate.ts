import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Programmatic schema migration — runs on every server startup.
 * Uses raw SQL so there is no dependency on drizzle-kit at runtime.
 * Every statement is idempotent: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS.
 * Tables are created in foreign-key dependency order.
 */
export async function runMigrations(): Promise<void> {
  logger.info("Running database migrations...");
  console.log("[migrate] Starting migrations...");

  const dbUrl = process.env["DATABASE_URL"] ?? "";
  try {
    const host = new URL(dbUrl).hostname;
    console.log(`[migrate] Connecting to database host: ${host}`);
  } catch {
    console.log("[migrate] WARNING: Could not parse DATABASE_URL");
  }

  const client = await pool.connect();
  console.log("[migrate] Database client connected.");

  try {
    // Ensure we are always operating in the public schema
    await client.query(`SET search_path TO public;`);
    console.log("[migrate] search_path set to public.");

    // ── Enum type ────────────────────────────────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE game_status AS ENUM ('scheduled', 'in_progress', 'final');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    // Add 'pending' value if not already present (cannot run inside a transaction block)
    await client.query(`ALTER TYPE game_status ADD VALUE IF NOT EXISTS 'pending';`);
    console.log("[migrate] game_status enum OK");

    // ── teams ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id               serial      PRIMARY KEY,
        name             text        NOT NULL,
        city             text        NOT NULL,
        abbreviation     text        NOT NULL,
        wins             integer     NOT NULL DEFAULT 0,
        losses           integer     NOT NULL DEFAULT 0,
        logo_url         text,
        primary_color    text        NOT NULL DEFAULT '#FF6B00',
        secondary_color  text        NOT NULL DEFAULT '#132237',
        current_season   text,
        created_at       timestamp   NOT NULL DEFAULT now()
      );
    `);
    console.log("[migrate] teams OK");

    // ── players ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id           serial    PRIMARY KEY,
        team_id      integer   REFERENCES teams(id) ON DELETE SET NULL,
        first_name   text      NOT NULL,
        last_name    text      NOT NULL,
        number       text,
        position     text,
        height_ft    integer,
        height_in    integer,
        weight_lbs   integer,
        avatar_url   text,
        bio          text,
        created_at   timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("[migrate] players OK");

    // ── games ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id             serial       PRIMARY KEY,
        home_team_id   integer      NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        away_team_id   integer      NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        home_score     integer,
        away_score     integer,
        game_date      text         NOT NULL,
        season         text         NOT NULL,
        location       text,
        status         game_status  NOT NULL DEFAULT 'scheduled',
        notes          text,
        external_links json         NOT NULL DEFAULT '[]',
        created_at     timestamp    NOT NULL DEFAULT now()
      );
    `);
    console.log("[migrate] games OK");

    // ── game_player_stats ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_player_stats (
        id                    serial  PRIMARY KEY,
        game_id               integer NOT NULL REFERENCES games(id)   ON DELETE CASCADE,
        player_id             integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        points                integer,
        rebounds              integer,
        assists               integer,
        steals                integer,
        blocks                integer,
        turnovers             integer,
        minutes_played        integer NOT NULL DEFAULT 0,
        field_goals_made      integer NOT NULL DEFAULT 0,
        field_goals_attempted integer NOT NULL DEFAULT 0,
        threes_made           integer,
        threes_attempted      integer NOT NULL DEFAULT 0,
        free_throws_made      integer NOT NULL DEFAULT 0,
        free_throws_attempted integer NOT NULL DEFAULT 0
      );
    `);
    console.log("[migrate] game_player_stats OK");

    // ── game_videos ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_videos (
        id                      serial    PRIMARY KEY,
        game_id                 integer   NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        uploader_clerk_user_id  text      NOT NULL,
        uploader_name           text      NOT NULL,
        title                   text      NOT NULL,
        object_path             text      NOT NULL,
        created_at              timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("[migrate] game_videos OK");

    // ── user_profiles ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id                serial    PRIMARY KEY,
        clerk_user_id     text      NOT NULL UNIQUE,
        first_name        text      NOT NULL,
        last_name         text      NOT NULL,
        school            text,
        position          text,
        graduation_year   integer,
        bio               text,
        team_id           integer,
        verified          boolean   NOT NULL DEFAULT false,
        avatar_url        text,
        number            text,
        is_admin          boolean   NOT NULL DEFAULT false,
        role              text      NOT NULL DEFAULT 'player',
        stamps            json      NOT NULL DEFAULT '[]',
        tides             json      NOT NULL DEFAULT '[]',
        milestones        json      NOT NULL DEFAULT '[]',
        archetype         text               DEFAULT 'Uncharted',
        career_stats      json               DEFAULT NULL,
        archetype_history json               DEFAULT NULL,
        created_at        timestamp NOT NULL DEFAULT now(),
        updated_at        timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("[migrate] user_profiles OK");

    // ── iso_ball_sessions ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS iso_ball_sessions (
        id            serial    PRIMARY KEY,
        clerk_user_id text      NOT NULL,
        difficulty    text      NOT NULL,
        score         integer   NOT NULL,
        points_earned integer   NOT NULL,
        played_at     timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("[migrate] iso_ball_sessions OK");

    // ── iso_ball_daily_questions ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS iso_ball_daily_questions (
        id             serial  PRIMARY KEY,
        clerk_user_id  text    NOT NULL,
        difficulty     text    NOT NULL,
        question_index integer NOT NULL,
        date           text    NOT NULL
      );
    `);
    console.log("[migrate] iso_ball_daily_questions OK");

    // ── arcade_sessions ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS arcade_sessions (
        id            serial    PRIMARY KEY,
        clerk_user_id text      NOT NULL,
        game          text      NOT NULL,
        score         integer   NOT NULL DEFAULT 0,
        best_streak   integer   NOT NULL DEFAULT 0,
        rounds_played integer   NOT NULL DEFAULT 0,
        played_at     timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("[migrate] arcade_sessions OK");

    // ── Additive column migrations (idempotent) ───────────────────────────────
    const addCol = (table: string, col: string, def: string) =>
      client.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def};`
      );

    await addCol("user_profiles", "milestones",        "json NOT NULL DEFAULT '[]'");
    await addCol("user_profiles", "career_stats",      "json DEFAULT NULL");
    await addCol("user_profiles", "archetype_history", "json DEFAULT NULL");
    await addCol("user_profiles", "archetype",         "text DEFAULT 'Uncharted'");
    await addCol("user_profiles", "tides",             "json NOT NULL DEFAULT '[]'");
    await addCol("user_profiles", "number",            "text");
    await addCol("user_profiles", "avatar_config",     "jsonb DEFAULT NULL");
    await addCol("games",            "external_links",    "json NOT NULL DEFAULT '[]'");
    await addCol("games",            "notes",             "text");
    await addCol("games",            "opponent_name",     "text");
    await addCol("games",            "pending_note",      "text");
    await addCol("games",            "submitted_by",      "text");
    // Make away_team_id nullable for my-team-only tracking mode
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='games'
            AND column_name='away_team_id' AND is_nullable='NO'
        ) THEN
          ALTER TABLE games ALTER COLUMN away_team_id DROP NOT NULL;
        END IF;
      END $$;
    `);
    await addCol("teams",            "current_season",    "text");
    await addCol("arcade_sessions",  "fgm",               "integer NOT NULL DEFAULT 0");
    await addCol("arcade_sessions",  "fga",               "integer NOT NULL DEFAULT 0");
    await addCol("arcade_sessions",  "tpm",               "integer NOT NULL DEFAULT 0");
    await addCol("arcade_sessions",  "tpa",               "integer NOT NULL DEFAULT 0");
    await addCol("arcade_sessions",  "dunks",             "integer NOT NULL DEFAULT 0");
    await addCol("user_profiles",    "is_pending",        "boolean NOT NULL DEFAULT FALSE");
    await addCol("user_profiles",    "requested_role",    "text DEFAULT NULL");
    await addCol("user_profiles",    "my_ballers",        "json NOT NULL DEFAULT '[]'");

    // ── Jersey stubs (unregistered player tracking) ───────────────────────────
    await addCol("players", "is_jersey_stub", "boolean NOT NULL DEFAULT FALSE");
    await addCol("games", "opponent_name", "text");
    await addCol("games", "pending_note", "text");
    await addCol("games", "submitted_by", "text");
    await client.query(`
      CREATE TABLE IF NOT EXISTS jersey_stubs (
        id            SERIAL PRIMARY KEY,
        jersey_number INTEGER NOT NULL,
        team_id       INTEGER NOT NULL REFERENCES teams(id),
        season        TEXT NOT NULL,
        player_id     INTEGER NOT NULL REFERENCES players(id),
        claimed_by_clerk_user_id TEXT,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(jersey_number, team_id, season)
      );
    `);
    // Make home_team_id nullable — supports "my team is away" tracking mode
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='games'
            AND column_name='home_team_id' AND is_nullable='NO'
        ) THEN
          ALTER TABLE games ALTER COLUMN home_team_id DROP NOT NULL;
        END IF;
      END $$;
    `);
    console.log("[migrate] Column additions OK");

    // ── Verify tables exist ───────────────────────────────────────────────────
    const { rows } = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    const tableNames = rows.map((r) => r.tablename).join(", ");
    console.log(`[migrate] Tables in public schema: ${tableNames}`);

    logger.info("Database migrations complete.");
    console.log("[migrate] Done.");
  } catch (err) {
    console.error("[migrate] ERROR:", err);
    logger.error({ err }, "Database migration failed");
    throw err;
  } finally {
    client.release();
    console.log("[migrate] Client released.");
  }
}
