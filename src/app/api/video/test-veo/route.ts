import { NextRequest, NextResponse } from "next/server";
import {
  isVeoAvailable,
  startVideoGeneration,
  getOperationStatus,
  waitForCompletion,
  createVideoPrompt,
  VEO_MODELS,
  type VeoModel,
  type VeoAspectRatio,
  type VeoDuration,
} from "@/lib/video/veo";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for video generation

const TEST_PROMPTS = {
  truck: "Cinematic shot of a powerful semi-truck driving on an endless American highway at golden hour, dramatic clouds, dust trails behind",
  food: "Close-up of a juicy steak sizzling on a cast iron skillet, butter melting, steam rising, appetizing food photography",
  sunrise: "Time-lapse of sunrise over a truck stop, night transitioning to dawn, mountains in background, peaceful atmosphere",
  engine: "Slow-motion close-up of a diesel engine starting, chrome details catching light, raw power and industrial beauty",
};

interface TestRequest {
  prompt?: string;
  preset?: keyof typeof TEST_PROMPTS;
  aspectRatio?: VeoAspectRatio;
  duration?: VeoDuration;
  model?: VeoModel;
  waitForResult?: boolean;
}

/**
 * POST /api/video/test-veo
 * Test Veo 3 video generation
 */
export async function POST(request: NextRequest) {
  try {
    const body: TestRequest = await request.json();
    const {
      prompt: customPrompt,
      preset = "truck",
      aspectRatio = "16:9",
      duration = 8,
      model = "veo-3",
      waitForResult = false,
    } = body;

    if (!isVeoAvailable()) {
      return NextResponse.json(
        {
          error: "Veo not configured",
          message: "Set GEMINI_API_KEY environment variable",
        },
        { status: 503 }
      );
    }

    const prompt = customPrompt || TEST_PROMPTS[preset];

    console.log(`[Veo Test] Starting generation with model ${model}`);
    console.log(`[Veo Test] Prompt: ${prompt.substring(0, 100)}...`);

    const startTime = Date.now();

    // Start the generation
    const operationName = await startVideoGeneration({
      prompt,
      aspectRatio,
      resolution: "720p",
      durationSeconds: duration,
      model,
    });

    console.log(`[Veo Test] Operation started: ${operationName}`);

    if (!waitForResult) {
      // Return immediately with operation ID for polling
      return NextResponse.json({
        success: true,
        status: "started",
        operationName,
        model: VEO_MODELS[model],
        aspectRatio,
        duration,
        prompt,
        checkStatusUrl: `/api/video/test-veo?operation=${encodeURIComponent(operationName)}`,
      });
    }

    // Wait for completion
    console.log(`[Veo Test] Waiting for completion...`);
    const videoUri = await waitForCompletion(operationName);
    const totalTime = Date.now() - startTime;

    console.log(`[Veo Test] Video ready in ${totalTime}ms: ${videoUri}`);

    return NextResponse.json({
      success: true,
      status: "complete",
      videoUri,
      model: VEO_MODELS[model],
      aspectRatio,
      duration,
      durationMs: totalTime,
      prompt,
    });
  } catch (error) {
    console.error("[Veo Test] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/test-veo
 * Check status of a Veo operation or return configuration
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const operationName = searchParams.get("operation");

  // If operation provided, check its status
  if (operationName) {
    if (!isVeoAvailable()) {
      return NextResponse.json(
        { error: "Veo not configured" },
        { status: 503 }
      );
    }

    try {
      const status = await getOperationStatus(operationName);

      if (status.error) {
        return NextResponse.json({
          status: "failed",
          error: status.error.message,
          code: status.error.code,
        });
      }

      if (status.done) {
        const videoUri =
          status.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        return NextResponse.json({
          status: "complete",
          videoUri,
        });
      }

      return NextResponse.json({
        status: "processing",
        operationName,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  }

  // Return configuration info
  return NextResponse.json({
    configured: isVeoAvailable(),
    provider: "veo-3",
    models: VEO_MODELS,
    presets: Object.keys(TEST_PROMPTS),
    endpoint: "POST /api/video/test-veo",
    examplePayload: {
      preset: "truck",
      aspectRatio: "16:9",
      duration: 8,
      model: "veo-3",
      waitForResult: true,
    },
    pricing: {
      "veo-3": "$0.40/second with audio",
      "veo-3-fast": "$0.20/second with audio",
    },
  });
}
