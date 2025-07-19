import { users, cvAnalyses, type User, type InsertUser, type CvAnalysis, type InsertCvAnalysis } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createCvAnalysis(analysis: InsertCvAnalysis): Promise<CvAnalysis>;
  getCvAnalysis(id: number): Promise<CvAnalysis | undefined>;
  updateCvAnalysis(id: number, updates: Partial<CvAnalysis>): Promise<CvAnalysis | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createCvAnalysis(analysis: InsertCvAnalysis): Promise<CvAnalysis> {
    const [cvAnalysis] = await db
      .insert(cvAnalyses)
      .values({
        ...analysis,
        status: "processing"
      })
      .returning();
    return cvAnalysis;
  }

  async getCvAnalysis(id: number): Promise<CvAnalysis | undefined> {
    const [analysis] = await db.select().from(cvAnalyses).where(eq(cvAnalyses.id, id));
    return analysis || undefined;
  }

  async updateCvAnalysis(id: number, updates: Partial<CvAnalysis>): Promise<CvAnalysis | undefined> {
    const [updated] = await db
      .update(cvAnalyses)
      .set(updates)
      .where(eq(cvAnalyses.id, id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
