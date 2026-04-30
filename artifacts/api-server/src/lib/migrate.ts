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
  const client = await pool.connect();

  try {
    // ── Enum type ────────────────────────────────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE game_status AS ENUM ('scheduled', 'in_progress', 'final');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ── teams (no foreign-key deps) ──────────────────────────────────────────
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

    // ── players (refs teams) ─────────────────────────────────────────────────
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

    // ── games (refs teams) ───────────────────────────────────────────────────
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

    // ── game_player_stats (refs games + players) ─────────────────────────────
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

    // ── game_videos (refs games) ─────────────────────────────────────────────
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

    // ── user_profiles (no foreign-key deps) ──────────────────────────────────
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

    // ── iso_ball_sessions (no foreign-key deps) ───────────────────────────────
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

    // ── iso_ball_daily_questions (no foreign-key deps) ────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS iso_ball_daily_questions (
        id             serial  PRIMARY KEY,
        clerk_user_id  text    NOT NULL,
        difficulty     text    NOT NULL,
        question_index integer NOT NULL,
        date           text    NOT NULL
      );
    `);

    // ── Additive column migrations (idempotent, safe on existing tables) ──────
    // These handle columns added after initial deployment.
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
    await addCol("games",         "external_links",    "json NOT NULL DEFAULT '[]'");
    await addCol("games",         "notes",             "text");
    await addCol("teams",         "current_season",    "text");

    logger.info("Database migrations complete.");
  } catch (err) {
    logger.error({ err }, "Database migration failed");
    throw err;
  } finally {
    client.release();
  }
}
