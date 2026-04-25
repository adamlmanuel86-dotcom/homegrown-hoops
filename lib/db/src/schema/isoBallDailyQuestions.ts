import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const isoBallDailyQuestionsTable = pgTable("iso_ball_daily_questions", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  difficulty: text("difficulty").notNull(),
  questionIndex: integer("question_index").notNull(),
  date: text("date").notNull(),
});

export type IsoBallDailyQuestion = typeof isoBallDailyQuestionsTable.$inferSelect;
