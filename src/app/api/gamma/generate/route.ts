import { NextRequest, NextResponse } from "next/server";
import { generateLeadMagnet, generateLandingPage, isConfigured } from "@/lib/gamma";

/**
 * POST /api/gamma/generate
 * Generate a lead magnet PDF or landing page via Gamma
 */
export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Gamma API not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { type, ...options } = body;

    let result;

    if (type === "leadMagnet") {
      result = await generateLeadMagnet(options);
    } else if (type === "landingPage") {
      result = await generateLandingPage(options);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'leadMagnet' or 'landingPage'" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Gamma] Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gamma/generate
 * Check if Gamma is configured
 */
export async function GET() {
  return NextResponse.json({
    configured: isConfigured(),
  });
}
