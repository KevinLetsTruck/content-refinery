import { NextRequest, NextResponse } from "next/server";
import {
  generateAndStoreVideo,
  createVideoPromptWithAI,
  isVeoAvailable,
  getAspectRatioForPlatform,
  VEO_MODELS,
  type VeoModel,
  type VeoDuration,
} from "@/lib/video/veo";

export const runtime = "nodejs";
export const maxDuration = 300; // Allow up to 5 min for video generation

interface GenerateRequest {
  text: string;
  contentType?: string;
  platform: string;
  customPrompt?: string;
  duration?: VeoDuration;
  model?: VeoModel;
}

/**
 * POST /api/videos/generate
 * Generate a social media video using Veo 3 (Google Gemini)
 * Stores result in R2 and returns public URL
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      text,
      contentType = "educational",
      platform,
      customPrompt,
      duration = 8,
      model = "veo-3",
    } = body;

    if (!text && !customPrompt) {
      return NextResponse.json(
        { error: "Either text or customPrompt is required" },
        { status: 400 }
      );
    }

    if (!platform) {
      return NextResponse.json(
        { error: "platform is required" },
        { status: 400 }
      );
    }

    // Validate duration
    if (![4, 6, 8].includes(duration)) {
      return NextResponse.json(
        { error: "duration must be 4, 6, or 8 seconds" },
        { status: 400 }
      );
    }

    // Check if Veo is configured
    if (!isVeoAvailable()) {
      console.warn("[Videos] Veo not configured");
      return NextResponse.json(
        {
          error: "Video generation not configured",
          message: "Set GEMINI_API_KEY environment variable with Veo access",
        },
        { status: 503 }
      );
    }

    console.log(
      `[Videos] Generating Veo video for ${platform}, type: ${contentType}, duration: ${duration}s, model: ${model}`
    );

    // Create or use custom prompt (AI-powered for better sentiment awareness)
    const prompt = customPrompt || await createVideoPromptWithAI(text, contentType, platform);
    console.log(`[Videos] Prompt: ${prompt.substring(0, 150)}...`);

    // Get aspect ratio for platform
    const aspectRatio = getAspectRatioForPlatform(platform);

    // Generate video and upload to R2
    const { videoUrl, durationSeconds } = await generateAndStoreVideo({
      prompt,
      aspectRatio,
      durationSeconds: duration,
      model,
      resolution: "1080p",
    });

    console.log(`[Videos] Successfully generated: ${videoUrl}`);

    return NextResponse.json({
      success: true,
      videoUrl,
      platform,
      aspectRatio,
      duration: durationSeconds,
      model: VEO_MODELS[model],
      modelName: model,
    });
  } catch (error) {
    console.error("[Videos] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos/generate
 * Check if video generation is configured
 */
export async function GET() {
  return NextResponse.json({
    configured: isVeoAvailable(),
    provider: "veo-3",
    models: VEO_MODELS,
    storage: "cloudflare-r2",
    durations: [4, 6, 8],
    defaultDuration: 8,
  });
}
