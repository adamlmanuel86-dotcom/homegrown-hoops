import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const isoBallSessionsTable = pgTable("iso_ball_sessions", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  difficulty: text("difficulty").notNull(),
  score: integer("score").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  playedAt: timestamp("played_at").notNull().defaultNow(),
});

export type IsoBallSession = typeof isoBallSessionsTable.$inferSelect;
