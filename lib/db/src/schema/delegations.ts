import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const gameTrackingDelegationsTable = pgTable("game_tracking_delegations", {
  id: serial("id").primaryKey(),
  managerClerkUserId: text("manager_clerk_user_id").notNull(),
  delegateeClerkUserId: text("delegatee_clerk_user_id").notNull(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  used: boolean("used").notNull().default(false),
  expiresAfterOneGame: boolean("expires_after_one_game").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameTrackingDelegationSchema = createInsertSchema(gameTrackingDelegationsTable).omit({ id: true, createdAt: true });
export type InsertGameTrackingDelegation = z.infer<typeof insertGameTrackingDelegationSchema>;
export type GameTrackingDelegation = typeof gameTrackingDelegationsTable.$inferSelect;
