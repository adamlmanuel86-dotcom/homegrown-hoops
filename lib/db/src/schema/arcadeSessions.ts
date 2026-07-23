import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const arcadeSessionsTable = pgTable("arcade_sessions", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  game: text("game").notNull(),
  score: integer("score").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  roundsPlayed: integer("rounds_played").notNull().default(0),
  playedAt: timestamp("played_at").notNull().defaultNow(),
});

export type ArcadeSession = typeof arcadeSessionsTable.$inferSelect;
