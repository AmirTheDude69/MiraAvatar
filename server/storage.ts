import { users, cvAnalyses, type User, type InsertUser, type CvAnalysis, type InsertCvAnalysis } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createCvAnalysis(analysis: InsertCvAnalysis): Promise<CvAnalysis>;
  getCvAnalysis(id: number): Promise<CvAnalysis | undefined>;
  updateCvAnalysis(id: number, updates: Partial<CvAnalysis>): Promise<CvAnalysis | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cvAnalyses: Map<number, CvAnalysis>;
  private currentUserId: number;
  private currentAnalysisId: number;

  constructor() {
    this.users = new Map();
    this.cvAnalyses = new Map();
    this.currentUserId = 1;
    this.currentAnalysisId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createCvAnalysis(analysis: InsertCvAnalysis): Promise<CvAnalysis> {
    const id = this.currentAnalysisId++;
    const cvAnalysis: CvAnalysis = { 
      ...analysis, 
      id,
      analysis: null,
      audioUrl: null,
      status: "processing",
      createdAt: new Date()
    };
    this.cvAnalyses.set(id, cvAnalysis);
    return cvAnalysis;
  }

  async getCvAnalysis(id: number): Promise<CvAnalysis | undefined> {
    return this.cvAnalyses.get(id);
  }

  async updateCvAnalysis(id: number, updates: Partial<CvAnalysis>): Promise<CvAnalysis | undefined> {
    const existing = this.cvAnalyses.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.cvAnalyses.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
