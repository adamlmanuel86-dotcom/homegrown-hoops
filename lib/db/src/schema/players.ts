import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  number: text("number"),
  position: text("position"),
  heightFt: integer("height_ft"),
  heightIn: integer("height_in"),
  weightLbs: integer("weight_lbs"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  isJerseyStub: boolean("is_jersey_stub").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
