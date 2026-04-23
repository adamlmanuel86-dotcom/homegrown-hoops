import { pgTable, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gamesTable } from "./games";
import { playersTable } from "./players";

export const gamePlayerStatsTable = pgTable("game_player_stats", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => gamesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  points: integer("points"),
  rebounds: integer("rebounds"),
  assists: integer("assists"),
  steals: integer("steals").notNull().default(0),
  blocks: integer("blocks").notNull().default(0),
  turnovers: integer("turnovers").notNull().default(0),
  minutesPlayed: integer("minutes_played").notNull().default(0),
  fieldGoalsMade: integer("field_goals_made").notNull().default(0),
  fieldGoalsAttempted: integer("field_goals_attempted").notNull().default(0),
  threesMade: integer("threes_made").notNull().default(0),
  threesAttempted: integer("threes_attempted").notNull().default(0),
  freeThrowsMade: integer("free_throws_made").notNull().default(0),
  freeThrowsAttempted: integer("free_throws_attempted").notNull().default(0),
});

export const insertGamePlayerStatSchema = createInsertSchema(gamePlayerStatsTable).omit({ id: true });
export type InsertGamePlayerStat = z.infer<typeof insertGamePlayerStatSchema>;
export type GamePlayerStat = typeof gamePlayerStatsTable.$inferSelect;
