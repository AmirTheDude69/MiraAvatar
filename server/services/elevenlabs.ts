import fs from "fs";
import path from "path";

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_KEY || "";
  }

  async generateSpeech(text: string, voiceId: string = "aEO01A4wXwd1O8GPgGlF"): Promise<string> {
    try {
      if (!this.apiKey) {
        console.log("No ElevenLabs API key provided, using mock audio");
        return "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav";
      }

      console.log("Generating speech with ElevenLabs...");
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey
        },
        body: JSON.stringify({
          text: text.length > 800 ? text.substring(0, 800) + "..." : text, // Limit for speed
          model_id: "eleven_turbo_v2_5", // Faster model
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.4,
            style: 0.0,
            use_speaker_boost: false // Disable for speed
          },
          output_format: "mp3_22050_32" // Lower quality for faster generation
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Get the audio data as a buffer
      const audioBuffer = await response.arrayBuffer();
      
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `speech_${timestamp}.mp3`;
      const filepath = path.join(process.cwd(), 'dist', 'public', 'audio', filename);
      
      // Ensure the audio directory exists
      const audioDir = path.dirname(filepath);
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      
      // Save the audio file
      fs.writeFileSync(filepath, Buffer.from(audioBuffer));
      
      // Return the public URL
      const audioUrl = `/audio/${filename}`;
      console.log(`Speech generated successfully: ${audioUrl}`);
      return audioUrl;
      
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
      // Return mock audio URL on error
      return "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav";
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
