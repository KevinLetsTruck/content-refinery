import { NextRequest, NextResponse } from "next/server";
import {
  generateImage as generateNanoBanana,
  createImagePrompt,
  getAspectRatioForPlatform,
  isNanoBananaAvailable,
  NANO_BANANA_MODELS,
} from "@/lib/images/nano-banana";

export const runtime = "nodejs";
export const maxDuration = 120;

interface CompareRequest {
  text: string;
  contentType?: string;
  platform?: string;
}

/**
 * POST /api/images/compare
 * Generate image with Nano Banana (Gemini)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CompareRequest = await request.json();
    const { text, contentType = "educational", platform = "instagram_feed" } = body;

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const results: {
      text: string;
      platform: string;
      nanoBanana?: { imageDataUrl: string; durationMs: number; prompt: string };
      errors: string[];
    } = {
      text,
      platform,
      errors: [],
    };

    // Generate Nano Banana image
    if (isNanoBananaAvailable()) {
      try {
        const prompt = createImagePrompt(text, contentType, platform);
        const startTime = Date.now();
        const imageBuffer = await generateNanoBanana(prompt, {
          aspectRatio: getAspectRatioForPlatform(platform),
          model: "standard",
        });
        results.nanoBanana = {
          imageDataUrl: `data:image/png;base64,${imageBuffer.toString("base64")}`,
          durationMs: Date.now() - startTime,
          prompt,
        };
      } catch (error) {
        results.errors.push(`Nano Banana: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } else {
      results.errors.push("Nano Banana: GEMINI_API_KEY not configured");
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/images/compare
 * Return generation status
 */
export async function GET() {
  return NextResponse.json({
    nanoBananaConfigured: isNanoBananaAvailable(),
    models: NANO_BANANA_MODELS,
    endpoint: "POST /api/images/compare",
    examplePayload: {
      text: "70% of professional drivers have Candida overgrowth",
      contentType: "stat",
      platform: "instagram_feed",
    },
  });
}
