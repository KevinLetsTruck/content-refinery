/**
 * ElevenLabs Voice Generation Client
 */

import { KEVIN_VOICE_CONFIG } from "./types";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface GenerateSpeechOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: Partial<VoiceSettings>;
}

export class ElevenLabsClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ELEVENLABS_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }
  }

  /**
   * Generate speech audio from text using Kevin's voice
   */
  async generateSpeech(options: GenerateSpeechOptions): Promise<ArrayBuffer> {
    const {
      text,
      voiceId = KEVIN_VOICE_CONFIG.voiceId,
      modelId = "eleven_multilingual_v2",
      voiceSettings,
    } = options;

    const settings: VoiceSettings = {
      stability: voiceSettings?.stability ?? KEVIN_VOICE_CONFIG.stability,
      similarity_boost: voiceSettings?.similarity_boost ?? KEVIN_VOICE_CONFIG.similarityBoost,
      style: voiceSettings?.style ?? KEVIN_VOICE_CONFIG.style,
      use_speaker_boost: true,
    };

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: settings,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Generate speech with timestamps for precise syncing
   */
  async generateSpeechWithTimestamps(options: GenerateSpeechOptions): Promise<{
    audio: ArrayBuffer;
    alignment: {
      characters: string[];
      character_start_times_seconds: number[];
      character_end_times_seconds: number[];
    };
  }> {
    const {
      text,
      voiceId = KEVIN_VOICE_CONFIG.voiceId,
      modelId = "eleven_multilingual_v2",
      voiceSettings,
    } = options;

    const settings: VoiceSettings = {
      stability: voiceSettings?.stability ?? KEVIN_VOICE_CONFIG.stability,
      similarity_boost: voiceSettings?.similarity_boost ?? KEVIN_VOICE_CONFIG.similarityBoost,
      style: voiceSettings?.style ?? KEVIN_VOICE_CONFIG.style,
      use_speaker_boost: true,
    };

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: settings,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // Decode base64 audio
    const audioBase64 = data.audio_base64;
    const audioBuffer = Buffer.from(audioBase64, "base64");
    
    return {
      audio: audioBuffer.buffer,
      alignment: data.alignment,
    };
  }

  /**
   * Get estimated speech duration for text (rough estimate)
   */
  estimateDuration(text: string): number {
    // Average speaking rate is about 150 words per minute
    const words = text.split(/\s+/).length;
    return Math.ceil((words / 150) * 60);
  }

  /**
   * List available voices
   */
  async listVoices(): Promise<any[]> {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: { "xi-api-key": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices;
  }

  /**
   * Get voice details
   */
  async getVoice(voiceId: string): Promise<any> {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/${voiceId}`, {
      headers: { "xi-api-key": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voice: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get subscription/usage info
   */
  async getSubscription(): Promise<any> {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/user/subscription`, {
      headers: { "xi-api-key": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch subscription: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
let elevenLabsClient: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenLabsClient) {
    elevenLabsClient = new ElevenLabsClient();
  }
  return elevenLabsClient;
}
