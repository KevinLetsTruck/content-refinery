import { NextRequest, NextResponse } from "next/server";
import { 
  generateAndStoreImage, 
  createImagePrompt, 
  isDalleAvailable,
  getSizeForPlatform
} from "@/lib/images/dalle";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for image generation

interface GenerateRequest {
  text: string;
  contentType?: string;
  platform: string;
  customPrompt?: string;
}

/**
 * POST /api/images/generate
 * Generate a social media image using DALL-E 3
 * Stores result in R2 and returns public URL
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { text, contentType = "educational", platform, customPrompt } = body;

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

    // Check if DALL-E is configured
    if (!isDalleAvailable()) {
      console.warn("[Images] DALL-E not configured");
      return NextResponse.json(
        { 
          error: "Image generation not configured",
          message: "Set OPENAI_API_KEY environment variable" 
        },
        { status: 503 }
      );
    }

    console.log(`[Images] Generating DALL-E 3 image for ${platform}, type: ${contentType}`);

    // Create or use custom prompt
    const prompt = customPrompt || createImagePrompt(text, contentType, platform);
    console.log(`[Images] Prompt: ${prompt.substring(0, 150)}...`);

    // Generate image and upload to R2
    const imageUrl = await generateAndStoreImage(prompt, platform);

    console.log(`[Images] Successfully generated: ${imageUrl}`);

    return NextResponse.json({
      success: true,
      imageUrl,
      platform,
      size: getSizeForPlatform(platform),
      model: "dall-e-3",
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
    configured: isDalleAvailable(),
    model: "dall-e-3",
    storage: "cloudflare-r2",
  });
}
