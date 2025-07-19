import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
});

export interface CVAnalysisResult {
  strengths: string[];
  improvements: string[];
  score: number;
  feedback: string;
}

export class OpenAIService {
  async analyzeCv(extractedText: string): Promise<CVAnalysisResult> {
    try {
      // Optimize input length and use faster model for speed
      const optimizedText = extractedText.length > 2000 ? extractedText.substring(0, 2000) + "..." : extractedText;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Faster model for quicker responses
        messages: [
          {
            role: "system",
            content: `CV analyzer. Provide concise feedback in JSON format:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "score": number,
  "feedback": "brief 2-3 sentence summary for voice delivery"
}`
          },
          {
            role: "user",
            content: `Analyze CV:\n\n${optimizedText}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower for faster, more focused responses
        max_tokens: 500 // Reduced for speed
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        strengths: result.strengths || [],
        improvements: result.improvements || [],
        score: Math.max(0, Math.min(100, result.score || 0)),
        feedback: result.feedback || "Unable to generate feedback at this time."
      };
    } catch (error) {
      console.error("OpenAI analysis error:", error);
      throw new Error(`Failed to analyze CV: ${error}`);
    }
  }

  // Direct chat with AI
  async chatWithAI(message: string, includeVoice: boolean = false): Promise<{ text: string; audioUrl?: string }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Faster model for chat responses
        messages: [
          {
            role: "system",
            content: "You are a helpful AI career coach and assistant. Provide friendly, professional, and informative responses to user questions. Keep responses conversational and engaging."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.5, // Lower for faster responses
        max_tokens: 300 // Reduced for speed
      });

      const text = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
      
      const result: { text: string; audioUrl?: string } = { text };
      
      if (includeVoice) {
        // Generate audio for the response if requested
        const { elevenLabsService } = await import("./elevenlabs");
        result.audioUrl = await elevenLabsService.generateSpeech(text);
      }
      
      return result;
    } catch (error) {
      console.error("OpenAI chat error:", error);
      throw new Error(`Failed to chat with AI: ${error}`);
    }
  }

  // Live voice chat processing
  async processVoiceInput(audioData: Buffer): Promise<{ text: string; response: string; audioUrl: string }> {
    try {
      // Create file-like object for OpenAI
      const audioFile = this.createAudioFile(audioData, "audio.wav");
      
      // First, transcribe the audio input using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      const userText = transcription.text;
      
      // Generate AI response
      const chatResponse = await this.chatWithAI(userText, false);
      
      // Generate voice response
      const { elevenLabsService } = await import("./elevenlabs");
      const audioUrl = await elevenLabsService.generateSpeech(chatResponse.text);
      
      return {
        text: userText,
        response: chatResponse.text,
        audioUrl
      };
    } catch (error) {
      console.error("Voice processing error:", error);
      throw new Error(`Failed to process voice input: ${error}`);
    }
  }

  // Transcribe audio for real-time chat
  async transcribeAudio(audioData: Buffer): Promise<{ text: string }> {
    try {
      const audioFile = this.createAudioFile(audioData, "audio.wav");
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      return {
        text: transcription.text
      };
    } catch (error) {
      console.error("Audio transcription error:", error);
      throw new Error(`Failed to transcribe audio: ${error}`);
    }
  }

  // Helper method to create File-like object for Node.js
  private createAudioFile(audioData: Buffer, filename: string): any {
    try {
      // Create a temporary file path
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `${Date.now()}_${filename}`);
      fs.writeFileSync(tempFilePath, audioData);
      
      // Create a readable stream for the file
      const fileStream = fs.createReadStream(tempFilePath);
      
      // Add cleanup after stream ends
      fileStream.on('end', () => {
        setTimeout(() => {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (err) {
            console.log('Error cleaning up temp file:', err);
          }
        }, 1000);
      });
      
      return fileStream;
    } catch (error) {
      console.error('Error creating audio file:', error);
      // Fallback: create a stream directly from buffer
      const stream = new Readable();
      stream.push(audioData);
      stream.push(null);
      return stream;
    }
  }

  // Chat with conversation context for real-time conversations
  async chatWithContext(
    message: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    try {
      // Build messages array with conversation history
      const messages = [
        {
          role: "system" as const,
          content: "You are a helpful AI career coach and assistant engaged in a live voice conversation. Provide natural, conversational responses that flow well when spoken aloud. Keep responses concise but engaging, as this is real-time voice chat."
        },
        // Add conversation history
        ...conversationHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        // Add current message
        {
          role: "user" as const,
          content: message
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Faster model for real-time conversation
        messages,
        temperature: 0.6, // Optimized for speed and quality
        max_tokens: 200, // Shorter for real-time chat
      });

      return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("OpenAI context chat error:", error);
      throw new Error(`Failed to chat with context: ${error}`);
    }
  }
}

export const openaiService = new OpenAIService();