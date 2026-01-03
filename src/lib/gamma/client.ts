/**
 * Gamma API Client for Content Refinery
 * Generates social media visuals using Gamma's AI
 */

import { GAMMA_BRAND_INSTRUCTIONS, LETSTRUCK_THEME_ID } from "./brand-rules";

const GAMMA_API_URL = "https://public-api.gamma.app/v1.0";
const GAMMA_API_KEY = process.env.GAMMA_API_KEY;

export type GammaOutputType = "social" | "presentation" | "document" | "webpage";
export type GammaImageSource = "aiGenerated" | "web" | "none";
export type GammaStatus = "pending" | "completed" | "failed";

interface GammaGenerationRequest {
  inputText: string;
  outputType?: GammaOutputType;
  themeId?: string;
  additionalInstructions?: string;
  imageOptions?: {
    source?: GammaImageSource;
    model?: string;
    style?: string;
  };
  textOptions?: {
    amount?: "brief" | "medium" | "detailed";
    tone?: string;
    audience?: string;
  };
  exportAs?: "pdf" | "pptx";
}

interface GammaGenerationResponse {
  generationId: string;
  status: GammaStatus;
}

interface GammaStatusResponse {
  generationId: string;
  status: GammaStatus;
  gammaUrl?: string;
  exportUrl?: string;
  credits?: {
    deducted: number;
    remaining: number;
  };
  error?: string;
}

export class GammaClient {
  private apiKey: string;
  private themeId: string;

  constructor(apiKey?: string, themeId?: string) {
    this.apiKey = apiKey || GAMMA_API_KEY || "";
    this.themeId = themeId || LETSTRUCK_THEME_ID;
    
    if (!this.apiKey) {
      console.warn("[Gamma] No API key configured - set GAMMA_API_KEY in environment");
    }
  }

  /**
   * Start a generation request
   */
  async generate(request: GammaGenerationRequest): Promise<GammaGenerationResponse> {
    if (!this.apiKey) {
      throw new Error("Gamma API key not configured");
    }

    // Inject brand instructions
    const fullInstructions = [
      GAMMA_BRAND_INSTRUCTIONS,
      request.additionalInstructions || "",
    ].filter(Boolean).join("\n\n");

    const response = await fetch(`${GAMMA_API_URL}/generations`, {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputText: request.inputText,
        format: request.outputType || "social",
        textMode: "generate",
        themeId: request.themeId || this.themeId,
        additionalInstructions: fullInstructions,
        imageOptions: request.imageOptions || {
          source: "aiGenerated",
          style: "photorealistic",
        },
        textOptions: request.textOptions || {
          amount: "brief",
          tone: "direct, confident, no-BS",
          audience: "professional drivers, owner-operators",
        },
        exportAs: request.exportAs,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Gamma API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check generation status
   */
  async checkStatus(generationId: string): Promise<GammaStatusResponse> {
    if (!this.apiKey) {
      throw new Error("Gamma API key not configured");
    }

    const response = await fetch(`${GAMMA_API_URL}/generations/${generationId}`, {
      method: "GET",
      headers: {
        "X-API-KEY": this.apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Gamma API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Poll for completion (with timeout)
   */
  async waitForCompletion(
    generationId: string,
    maxWaitMs: number = 120000, // 2 minutes default
    pollIntervalMs: number = 3000 // 3 seconds
  ): Promise<GammaStatusResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkStatus(generationId);

      if (status.status === "completed") {
        return status;
      }

      if (status.status === "failed") {
        throw new Error(`Generation failed: ${status.error || "Unknown error"}`);
      }

      // Still pending, wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Generation timed out after ${maxWaitMs / 1000} seconds`);
  }

  /**
   * Generate and wait for completion (convenience method)
   */
  async generateAndWait(request: GammaGenerationRequest): Promise<GammaStatusResponse> {
    const { generationId } = await this.generate(request);
    return this.waitForCompletion(generationId);
  }

  /**
   * List available themes
   */
  async listThemes(): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error("Gamma API key not configured");
    }

    const response = await fetch(`${GAMMA_API_URL}/themes`, {
      method: "GET",
      headers: {
        "X-API-KEY": this.apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list themes: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
let gammaClient: GammaClient | null = null;

export function getGammaClient(): GammaClient {
  if (!gammaClient) {
    gammaClient = new GammaClient();
  }
  return gammaClient;
}

export default GammaClient;
