import { NextRequest, NextResponse } from "next/server";
import {
  generateAndStoreImage,
  createImagePrompt,
  isNanoBananaAvailable,
  getAspectRatioForPlatform,
  NANO_BANANA_MODELS,
  type NanoBananaModel,
} from "@/lib/images/nano-banana";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow up to 2 min for image generation

interface GenerateRequest {
  text: string;
  contentType?: string;
  platform: string;
  customPrompt?: string;
  model?: NanoBananaModel;
}

/**
 * POST /api/images/generate
 * Generate a social media image using Nano Banana (Google Gemini)
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
      model = "standard",
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

    // Check if Nano Banana is configured
    if (!isNanoBananaAvailable()) {
      console.warn("[Images] Nano Banana not configured");
      return NextResponse.json(
        {
          error: "Image generation not configured",
          message: "Set GEMINI_API_KEY environment variable",
        },
        { status: 503 }
      );
    }

    console.log(
      `[Images] Generating Nano Banana image for ${platform}, type: ${contentType}, model: ${model}`
    );

    // Create or use custom prompt
    const prompt = customPrompt || createImagePrompt(text, contentType, platform);
    console.log(`[Images] Prompt: ${prompt.substring(0, 150)}...`);

    // Generate image and upload to R2
    const imageUrl = await generateAndStoreImage(prompt, platform, model);

    console.log(`[Images] Successfully generated: ${imageUrl}`);

    return NextResponse.json({
      success: true,
      imageUrl,
      platform,
      aspectRatio: getAspectRatioForPlatform(platform),
      model: NANO_BANANA_MODELS[model],
      modelName: model,
    });
  } catch (error) {
    console.error("[Images] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/images/generate
 * Check if image generation is configured
 */
export async function GET() {
  return NextResponse.json({
    configured: isNanoBananaAvailable(),
    provider: "nano-banana",
    models: NANO_BANANA_MODELS,
    storage: "cloudflare-r2",
  });
}
