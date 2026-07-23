import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";
import { playersTable } from "./players";

export const jerseyStubsTable = pgTable(
  "jersey_stubs",
  {
    id: serial("id").primaryKey(),
    jerseyNumber: integer("jersey_number").notNull(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teamsTable.id),
    season: text("season").notNull(),
    playerId: integer("player_id")
      .notNull()
      .references(() => playersTable.id),
    claimedByClerkUserId: text("claimed_by_clerk_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.jerseyNumber, t.teamId, t.season)]
);

export type JerseyStub = typeof jerseyStubsTable.$inferSelect;
