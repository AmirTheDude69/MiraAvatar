import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { pdfParser } from "./services/pdf-parser";
import { openaiService } from "./services/openai";
import { elevenLabsService } from "./services/elevenlabs";
import { insertCvAnalysisSchema } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Upload and analyze CV
  app.post("/api/cv/upload", upload.single('cv'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Extract text from PDF
      const extractedText = await pdfParser.extractText(req.file.buffer);
      
      // Create initial analysis record
      const analysis = await storage.createCvAnalysis({
        fileName: req.file.originalname,
        extractedText
      });

      // Start async processing
      processAnalysis(analysis.id);

      res.json({ 
        id: analysis.id, 
        status: "processing",
        message: "CV uploaded successfully. Analysis in progress." 
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to process CV upload" });
    }
  });

  // Get analysis status and results
  app.get("/api/cv/analysis/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getCvAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      console.log(`Returning analysis ${id} with status: ${analysis.status}`);
      
      // Create a response object with important fields first and truncated text
      const response = {
        id: analysis.id,
        status: analysis.status,
        fileName: analysis.fileName,
        analysis: analysis.analysis,
        audioUrl: analysis.audioUrl,
        createdAt: analysis.createdAt,
        // Truncate extracted text to prevent response size issues
        extractedText: analysis.extractedText.substring(0, 1000) + (analysis.extractedText.length > 1000 ? '...' : '')
      };
      
      console.log('Sending response with status:', response.status);
      res.json(response);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ message: "Failed to get analysis" });
    }
  });

  // Background processing function
  async function processAnalysis(id: number) {
    try {
      console.log(`Starting background processing for analysis ${id}`);
      const analysis = await storage.getCvAnalysis(id);
      if (!analysis) {
        console.error(`Analysis ${id} not found`);
        return;
      }

      console.log(`Processing CV with ${analysis.extractedText.length} characters`);

      // Analyze with OpenAI
      console.log("Calling OpenAI for analysis...");
      const aiAnalysis = await openaiService.analyzeCv(analysis.extractedText);
      console.log("OpenAI analysis completed:", aiAnalysis);
      
      // Generate speech with ElevenLabs
      console.log("Generating speech with ElevenLabs...");
      const audioUrl = await elevenLabsService.generateSpeech(aiAnalysis.feedback);
      console.log(`Speech generated: ${audioUrl}`);
      
      // Update analysis with results
      console.log("Updating analysis with results...");
      await storage.updateCvAnalysis(id, {
        analysis: aiAnalysis,
        audioUrl,
        status: "completed"
      });
      console.log(`Analysis ${id} completed successfully`);

    } catch (error) {
      console.error("Analysis processing error:", error);
      console.error("Error details:", (error as Error).message);
      console.error("Stack trace:", (error as Error).stack);
      await storage.updateCvAnalysis(id, {
        status: "failed"
      });
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
