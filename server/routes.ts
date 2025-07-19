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

  // Direct AI Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, includeVoice = false } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get AI response
      const aiResponse = await openaiService.chatWithAI(message, includeVoice);
      
      // Save to database
      const chatMessage = await storage.createChatMessage({
        message,
        response: aiResponse.text,
        type: includeVoice ? "voice" : "text"
      });

      // Update with audio URL if voice was requested
      if (includeVoice && aiResponse.audioUrl) {
        await storage.updateChatMessage(chatMessage.id, {
          audioUrl: aiResponse.audioUrl
        });
      }

      res.json({
        id: chatMessage.id,
        message,
        response: aiResponse.text,
        audioUrl: aiResponse.audioUrl,
        type: includeVoice ? "voice" : "text"
      });

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Get chat history
  app.get("/api/chat/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const messages = await storage.getChatMessages(limit);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error("Chat history error:", error);
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  // Voice chat endpoint (for live voice input)
  app.post("/api/voice/chat", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      // Process voice input
      const result = await openaiService.processVoiceInput(req.file.buffer);
      
      // Save to database
      const chatMessage = await storage.createChatMessage({
        message: result.text,
        response: result.response,
        type: "voice"
      });

      await storage.updateChatMessage(chatMessage.id, {
        audioUrl: result.audioUrl
      });

      res.json({
        id: chatMessage.id,
        userText: result.text,
        response: result.response,
        audioUrl: result.audioUrl,
        type: "voice"
      });

    } catch (error) {
      console.error("Voice chat error:", error);
      res.status(500).json({ message: "Failed to process voice input" });
    }
  });

  // Voice session management
  app.post("/api/voice/session", async (req, res) => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session = await storage.createVoiceSession({
        sessionId,
        status: "active"
      });

      res.json({
        sessionId: session.sessionId,
        status: session.status
      });

    } catch (error) {
      console.error("Voice session error:", error);
      res.status(500).json({ message: "Failed to create voice session" });
    }
  });

  app.put("/api/voice/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { status } = req.body;

      const session = await storage.updateVoiceSession(sessionId, {
        status,
        lastActivity: new Date()
      });

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json({
        sessionId: session.sessionId,
        status: session.status
      });

    } catch (error) {
      console.error("Voice session update error:", error);
      res.status(500).json({ message: "Failed to update voice session" });
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
