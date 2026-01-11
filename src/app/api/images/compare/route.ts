import { NextRequest, NextResponse } from "next/server";
import {
  generateImage as generateNanoBanana,
  createImagePrompt as createNanoBananaPrompt,
  getAspectRatioForPlatform,
  isNanoBananaAvailable,
} from "@/lib/images/nano-banana";
import {
  generateImage as generateDalle,
  createImagePrompt as createDallePrompt,
  getSizeForPlatform,
  isDalleAvailable,
} from "@/lib/images/dalle";

export const runtime = "nodejs";
export const maxDuration = 120;

interface CompareRequest {
  text: string;
  contentType?: string;
  platform?: string;
}

/**
 * POST /api/images/compare
 * Generate side-by-side comparison of Nano Banana vs DALL-E
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
      dalle?: { imageDataUrl: string; durationMs: number; prompt: string };
      errors: string[];
    } = {
      text,
      platform,
      errors: [],
    };

    // Generate Nano Banana image
    if (isNanoBananaAvailable()) {
      try {
        const prompt = createNanoBananaPrompt(text, contentType, platform);
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

    // Generate DALL-E image
    if (isDalleAvailable()) {
      try {
        const prompt = createDallePrompt(text, contentType, platform);
        const startTime = Date.now();
        const imageBuffer = await generateDalle(prompt, platform);
        results.dalle = {
          imageDataUrl: `data:image/png;base64,${imageBuffer.toString("base64")}`,
          durationMs: Date.now() - startTime,
          prompt,
        };
      } catch (error) {
        results.errors.push(`DALL-E: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } else {
      results.errors.push("DALL-E: OPENAI_API_KEY not configured");
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
 * Return comparison status
 */
export async function GET() {
  return NextResponse.json({
    nanoBananaConfigured: isNanoBananaAvailable(),
    dalleConfigured: isDalleAvailable(),
    endpoint: "POST /api/images/compare",
    examplePayload: {
      text: "70% of professional drivers have Candida overgrowth",
      contentType: "stat",
      platform: "instagram_feed",
    },
  });
}
