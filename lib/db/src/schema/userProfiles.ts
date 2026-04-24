import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const USER_ROLES = ["admin", "coach", "player", "parent"] as const;
export type UserRole = typeof USER_ROLES[number];

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  school: text("school"),
  position: text("position"),
  graduationYear: integer("graduation_year"),
  bio: text("bio"),
  teamId: integer("team_id"),
  verified: boolean("verified").notNull().default(false),
  avatarUrl: text("avatar_url"),
  number: text("number"),
  isAdmin: boolean("is_admin").notNull().default(false),
  role: text("role").notNull().default("player"),
  stamps: json("stamps").$type<{ id: string; earnedAt: string }[]>().notNull().default([]),
  tides: json("tides").$type<{ id: string; earnedAt: string }[]>().notNull().default([]),
  archetype: text("archetype").default("Uncharted"),
  linkedPlayerId: integer("linked_player_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  id: true,
  isAdmin: true,
  role: true,
  verified: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
