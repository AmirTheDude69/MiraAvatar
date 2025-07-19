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

      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ message: "Failed to get analysis" });
    }
  });

  // Background processing function
  async function processAnalysis(id: number) {
    try {
      const analysis = await storage.getCvAnalysis(id);
      if (!analysis) return;

      // Analyze with OpenAI
      const aiAnalysis = await openaiService.analyzeCv(analysis.extractedText);
      
      // Generate speech with ElevenLabs
      const audioUrl = await elevenLabsService.generateSpeech(aiAnalysis.feedback);
      
      // Update analysis with results
      await storage.updateCvAnalysis(id, {
        analysis: aiAnalysis,
        audioUrl,
        status: "completed"
      });

    } catch (error) {
      console.error("Analysis processing error:", error);
      await storage.updateCvAnalysis(id, {
        status: "failed"
      });
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
