import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const arcadeSessionsTable = pgTable("arcade_sessions", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  game: text("game").notNull(),
  score: integer("score").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  roundsPlayed: integer("rounds_played").notNull().default(0),
  fgm: integer("fgm").notNull().default(0),
  fga: integer("fga").notNull().default(0),
  tpm: integer("tpm").notNull().default(0),
  tpa: integer("tpa").notNull().default(0),
  dunks: integer("dunks").notNull().default(0),
  playedAt: timestamp("played_at").notNull().defaultNow(),
});

export type ArcadeSession = typeof arcadeSessionsTable.$inferSelect;
