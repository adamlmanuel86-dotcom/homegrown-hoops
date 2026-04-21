import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { gamesTable } from "./games";

export const gameVideosTable = pgTable("game_videos", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => gamesTable.id, { onDelete: "cascade" }),
  uploaderClerkUserId: text("uploader_clerk_user_id").notNull(),
  uploaderName: text("uploader_name").notNull(),
  title: text("title").notNull(),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GameVideo = typeof gameVideosTable.$inferSelect;
