import OpenAI from "openai";

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
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert career coach and CV analyzer. Take a thorough look at this CV, compare it with others in its relative field, and give some constructive, actionable, and specific feedback.

Provide your analysis in JSON format with:
1. 3-5 key strengths
2. 3-5 areas for improvement  
3. An overall score out of 100
4. Detailed feedback for voice delivery (2-3 paragraphs that sound natural when spoken)

Respond with JSON in this exact format:
{
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "score": number,
  "feedback": "detailed feedback text for voice delivery that sounds natural when spoken aloud"
}`
          },
          {
            role: "user",
            content: `Take a thorough look at this CV, compare it with others in its relative field, and give some constructive, actionable, and specific feedback:\n\n${extractedText}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
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
}

export const openaiService = new OpenAIService();
