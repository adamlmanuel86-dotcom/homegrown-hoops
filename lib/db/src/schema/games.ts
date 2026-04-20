import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const gameStatusEnum = pgEnum("game_status", ["scheduled", "in_progress", "final"]);

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  homeTeamId: integer("home_team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  awayTeamId: integer("away_team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  gameDate: text("game_date").notNull(),
  season: text("season").notNull(),
  location: text("location"),
  status: gameStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameSchema = createInsertSchema(gamesTable).omit({ id: true, createdAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof gamesTable.$inferSelect;
