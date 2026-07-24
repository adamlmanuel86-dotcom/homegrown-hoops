import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const USER_ROLES = ["admin", "manager", "coach", "player", "parent"] as const;
export type UserRole = typeof USER_ROLES[number];

export type AvatarConfig = {
  skin: number;
  build: "standard" | "stocky" | "lanky";
  hairStyle: "fade" | "curls" | "bald" | "long" | "afro" | "mohawk" | "flattop";
  hairColor: number;
  jersey: number;
  jerseyStyle: "solid" | "pinstripe";
  secondaryColor: number;
  shorts: number;
  accessories: { headband: boolean; wristbands: boolean; kneepads: boolean };
  accessoryColor: number;
  eyebrows: "none" | "angry" | "raised";
  mouth: "neutral" | "smile" | "smirk" | "frown";
};

export type TideEntry = { id: string; earnedAt: string; season?: string };
export type CareerStats = {
  gamesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  threesMade: number;
};
export type ArchetypeHistoryEntry = { season: string; archetype: string };
export type RequestedTeamRosterEntry = { jerseyNumber: string; playerName: string };
export type RequestedTeamInfo = {
  teamName: string;
  league?: string;
  city?: string;
  roster: RequestedTeamRosterEntry[];
};

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
  avatarConfig: jsonb("avatar_config").$type<AvatarConfig | null>().default(null),
  number: text("number"),
  isAdmin: boolean("is_admin").notNull().default(false),
  role: text("role").notNull().default("player"),
  isPending: boolean("is_pending").notNull().default(false),
  requestedRole: text("requested_role"),
  stamps: json("stamps").$type<{ id: string; earnedAt: string }[]>().notNull().default([]),
  tides: json("tides").$type<TideEntry[]>().notNull().default([]),
  milestones: json("milestones").$type<{ id: string; earnedAt: string }[]>().notNull().default([]),
  archetype: text("archetype").default("Uncharted"),
  careerStats: json("career_stats").$type<CareerStats | null>().default(null),
  archetypeHistory: json("archetype_history").$type<ArchetypeHistoryEntry[] | null>().default(null),
  myBallers: json("my_ballers").$type<number[]>().notNull().default([]),
  teamIds: json("team_ids").$type<number[]>().notNull().default([]),
  requestedTeamInfo: json("requested_team_info").$type<RequestedTeamInfo | null>().default(null),
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
