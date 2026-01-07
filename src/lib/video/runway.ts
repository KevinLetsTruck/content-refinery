/**
 * Runway ML Video Generation Client
 * 
 * Uses Runway's Gen-3 Alpha for AI video generation
 * Docs: https://docs.runwayml.com/
 */

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_BASE_URL = "https://api.runwayml.com/v1";

export type RunwayAspectRatio = "16:9" | "9:16";
export type RunwayDuration = 5 | 10; // Gen-3 supports 5 or 10 second clips

interface GenerateVideoOptions {
  prompt: string;
  aspectRatio?: RunwayAspectRatio;
  duration?: RunwayDuration;
  seed?: number;
  watermark?: boolean;
}

interface GenerationTask {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  progress?: number;
  output?: string[]; // Array of video URLs
  failure?: string;
  failureCode?: string;
}

export class RunwayClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || RUNWAY_API_KEY || "";
    if (!this.apiKey) {
      console.warn("Runway API key not configured - video generation will be disabled");
    }
  }

  /**
   * Check if Runway is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Start a video generation task
   */
  async generateVideo(options: GenerateVideoOptions): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Runway API key not configured");
    }

    const {
      prompt,
      aspectRatio = "16:9",
      duration = 5,
      seed,
      watermark = false,
    } = options;

    const response = await fetch(`${RUNWAY_BASE_URL}/image_to_video`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen3a_turbo",
        promptText: prompt,
        ratio: aspectRatio,
        duration,
        seed,
        watermark,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runway API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.id; // Task ID
  }

  /**
   * Start text-to-video generation (no input image)
   */
  async generateVideoFromText(options: GenerateVideoOptions): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Runway API key not configured");
    }

    const {
      prompt,
      aspectRatio = "16:9",
      duration = 5,
      seed,
      watermark = false,
    } = options;

    // Gen-3 Alpha Turbo text-to-video
    const response = await fetch(`${RUNWAY_BASE_URL}/text_to_video`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen3a_turbo",
        promptText: prompt,
        ratio: aspectRatio,
        duration,
        seed,
        watermark,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runway API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Check the status of a generation task
   */
  async getTaskStatus(taskId: string): Promise<GenerationTask> {
    if (!this.isConfigured()) {
      throw new Error("Runway API key not configured");
    }

    const response = await fetch(`${RUNWAY_BASE_URL}/tasks/${taskId}`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runway API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Wait for a task to complete with polling
   */
  async waitForCompletion(
    taskId: string,
    maxWaitMs: number = 300000, // 5 minutes default
    pollIntervalMs: number = 5000
  ): Promise<GenerationTask> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const task = await this.getTaskStatus(taskId);

      if (task.status === "SUCCEEDED") {
        return task;
      }

      if (task.status === "FAILED") {
        throw new Error(`Video generation failed: ${task.failure || task.failureCode || "Unknown error"}`);
      }

      // Still pending/running, wait and poll again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Video generation timed out after ${maxWaitMs / 1000} seconds`);
  }

  /**
   * Generate video and wait for completion
   */
  async generateAndWait(options: GenerateVideoOptions): Promise<string> {
    const taskId = await this.generateVideoFromText(options);
    const result = await this.waitForCompletion(taskId);
    
    if (!result.output || result.output.length === 0) {
      throw new Error("No video output from generation");
    }

    return result.output[0]; // Return first video URL
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Runway API key not configured");
    }

    const response = await fetch(`${RUNWAY_BASE_URL}/tasks/${taskId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to cancel task: ${error}`);
    }
  }
}

// Singleton instance
let runwayClient: RunwayClient | null = null;

export function getRunwayClient(): RunwayClient {
  if (!runwayClient) {
    runwayClient = new RunwayClient();
  }
  return runwayClient;
}

/**
 * Enhance a visual prompt for better Runway generation
 */
export function enhancePromptForRunway(
  basePrompt: string,
  style: "cinematic" | "documentary" | "energetic" | "calm" = "cinematic",
  cameraMovement: string = "slow_pan"
): string {
  const styleModifiers: Record<string, string> = {
    cinematic: "cinematic lighting, film grain, shallow depth of field, anamorphic lens flare",
    documentary: "natural lighting, handheld camera feel, authentic, raw footage",
    energetic: "dynamic movement, vibrant colors, fast cuts, high energy",
    calm: "soft lighting, serene atmosphere, gentle movement, peaceful mood",
  };

  const cameraModifiers: Record<string, string> = {
    static: "locked off shot, stable camera",
    slow_pan: "slow panning shot, smooth camera movement",
    zoom_in: "slow zoom in, building intensity",
    zoom_out: "slow zoom out, revealing shot",
    tracking: "tracking shot, following the subject",
  };

  const enhanced = `${basePrompt}, ${styleModifiers[style] || styleModifiers.cinematic}, ${cameraModifiers[cameraMovement] || cameraModifiers.slow_pan}, 4K quality, professional production`;

  return enhanced;
}
