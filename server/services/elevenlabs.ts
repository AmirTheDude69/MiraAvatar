export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_KEY || "";
  }

  async generateSpeech(text: string, voiceId: string = "21m00Tcm4TlvDq8ikWAM"): Promise<string> {
    try {
      if (!this.apiKey) {
        // Return a mock audio URL if no API key is provided
        return "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav";
      }

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // In a real implementation, you would save the audio blob and return a URL
      // For now, return a mock URL
      return "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav";
      
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
      // Return mock audio URL on error
      return "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav";
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
