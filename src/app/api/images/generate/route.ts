import { NextRequest, NextResponse } from "next/server";
import { 
  generateImage, 
  createImagePrompt, 
  getDimensionsForPlatform, 
  isConfigured 
} from "@/lib/images/cloudflare-ai";
import { uploadToR2, getPublicUrl } from "@/lib/storage/r2";

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
 * Generate a social media image using Cloudflare Workers AI
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

    // Check if Cloudflare AI is configured
    if (!isConfigured()) {
      console.warn("[Images] Cloudflare AI not configured");
      return NextResponse.json(
        { 
          error: "Image generation not configured",
          message: "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN" 
        },
        { status: 503 }
      );
    }

    console.log(`[Images] Generating image for ${platform}, type: ${contentType}`);

    // Get dimensions for platform
    const dimensions = getDimensionsForPlatform(platform);

    // Create or use custom prompt
    const prompt = customPrompt || createImagePrompt(text, contentType, platform);
    console.log(`[Images] Prompt: ${prompt.substring(0, 100)}...`);

    // Generate image
    const result = await generateImage({
      prompt,
      width: dimensions.width,
      height: dimensions.height,
    });

    if (!result.success || !result.imageData) {
      console.error("[Images] Generation failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Image generation failed" },
        { status: 500 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `social-images/${platform}/${timestamp}-${randomId}.png`;

    console.log(`[Images] Uploading to R2: ${filename}`);

    // Upload to R2
    try {
      await uploadToR2(filename, result.imageData, result.contentType);
      const publicUrl = getPublicUrl(filename);

      console.log(`[Images] Successfully uploaded: ${publicUrl}`);

      return NextResponse.json({
        success: true,
        imageUrl: publicUrl,
        filename,
        platform,
        dimensions,
        prompt: prompt.substring(0, 200),
      });
    } catch (uploadError) {
      console.error("[Images] R2 upload failed:", uploadError);
      return NextResponse.json(
        { error: "Failed to store image" },
        { status: 500 }
      );
    }
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
    configured: isConfigured(),
    model: "@cf/bytedance/stable-diffusion-xl-lightning",
    storage: "cloudflare-r2",
  });
}

