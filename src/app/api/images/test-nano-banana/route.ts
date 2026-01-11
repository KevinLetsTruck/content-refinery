import { NextRequest, NextResponse } from "next/server";
import {
  generateImage,
  isNanoBananaAvailable,
  createImagePrompt,
  getAspectRatioForPlatform,
  NANO_BANANA_MODELS,
  type NanoBananaModel,
} from "@/lib/images/nano-banana";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow up to 2 min for image generation

/**
 * POST /api/images/test-nano-banana
 * Test Nano Banana image generation - returns base64 image for quick preview
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      contentType = "educational",
      platform = "instagram_feed",
      customPrompt,
      model = "standard",
    } = body as {
      text?: string;
      contentType?: string;
      platform?: string;
      customPrompt?: string;
      model?: NanoBananaModel;
    };

    if (!text && !customPrompt) {
      return NextResponse.json(
        { error: "Either text or customPrompt is required" },
        { status: 400 }
      );
    }

    if (!isNanoBananaAvailable()) {
      return NextResponse.json(
        {
          error: "Nano Banana not configured",
          message: "Set GEMINI_API_KEY environment variable",
        },
        { status: 503 }
      );
    }

    console.log(
      `[Nano Banana Test] Generating image for ${platform}, model: ${model}`
    );

    // Create or use custom prompt
    const prompt =
      customPrompt || createImagePrompt(text!, contentType, platform);
    console.log(`[Nano Banana Test] Prompt: ${prompt.substring(0, 200)}...`);

    const startTime = Date.now();

    // Generate image (returns buffer)
    const imageBuffer = await generateImage(prompt, {
      aspectRatio: getAspectRatioForPlatform(platform),
      model,
    });

    const duration = Date.now() - startTime;
    console.log(
      `[Nano Banana Test] Generated in ${duration}ms, size: ${imageBuffer.length} bytes`
    );

    // Return base64 for quick preview (no R2 upload for testing)
    const base64Image = imageBuffer.toString("base64");

    return NextResponse.json({
      success: true,
      platform,
      aspectRatio: getAspectRatioForPlatform(platform),
      model: NANO_BANANA_MODELS[model],
      modelName: model,
      durationMs: duration,
      imageSizeBytes: imageBuffer.length,
      promptUsed: prompt,
      // Data URL for direct display in browser
      imageDataUrl: `data:image/png;base64,${base64Image}`,
    });
  } catch (error) {
    console.error("[Nano Banana Test] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/images/test-nano-banana
 * Check if Nano Banana is configured and run a quick test
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const runTest = searchParams.get("test") === "true";

  const status = {
    configured: isNanoBananaAvailable(),
    models: NANO_BANANA_MODELS,
    testEndpoint: "POST /api/images/test-nano-banana",
    examplePayload: {
      text: "70% of professional drivers have Candida overgrowth",
      contentType: "stat",
      platform: "instagram_feed",
      model: "standard",
    },
  };

  if (!runTest) {
    return NextResponse.json(status);
  }

  // Run a quick test if requested
  if (!isNanoBananaAvailable()) {
    return NextResponse.json({
      ...status,
      testResult: "FAILED - GEMINI_API_KEY not set",
    });
  }

  try {
    console.log("[Nano Banana Test] Running quick connectivity test...");

    const testPrompt =
      "A beautiful sunset over an American highway with a semi-truck silhouette. Cinematic, orange and black color palette. No text.";

    const startTime = Date.now();
    const imageBuffer = await generateImage(testPrompt, {
      aspectRatio: "16:9",
      model: "standard",
    });
    const duration = Date.now() - startTime;

    return NextResponse.json({
      ...status,
      testResult: "SUCCESS",
      testDurationMs: duration,
      testImageSizeBytes: imageBuffer.length,
      testImageDataUrl: `data:image/png;base64,${imageBuffer.toString("base64")}`,
    });
  } catch (error) {
    return NextResponse.json({
      ...status,
      testResult: `FAILED - ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
