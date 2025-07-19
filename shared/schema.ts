import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const cvAnalyses = pgTable("cv_analyses", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  extractedText: text("extracted_text").notNull(),
  analysis: jsonb("analysis").$type<{
    strengths: string[];
    improvements: string[];
    score: number;
    feedback: string;
  }>(),
  audioUrl: text("audio_url"),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCvAnalysisSchema = createInsertSchema(cvAnalyses).pick({
  fileName: true,
  extractedText: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CvAnalysis = typeof cvAnalyses.$inferSelect;
export type InsertCvAnalysis = z.infer<typeof insertCvAnalysisSchema>;
