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
    rawFeedback?: string;
  }>(),
  audioUrl: text("audio_url"),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  response: text("response").notNull(),
  audioUrl: text("audio_url"),
  type: text("type").notNull().default("text"), // text, voice
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voiceSessions = pgTable("voice_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  status: text("status").notNull().default("inactive"), // inactive, active, processing
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
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

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  message: true,
  response: true,
  type: true,
});

export const insertVoiceSessionSchema = createInsertSchema(voiceSessions).pick({
  sessionId: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CvAnalysis = typeof cvAnalyses.$inferSelect;
export type InsertCvAnalysis = z.infer<typeof insertCvAnalysisSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type VoiceSession = typeof voiceSessions.$inferSelect;
export type InsertVoiceSession = z.infer<typeof insertVoiceSessionSchema>;
