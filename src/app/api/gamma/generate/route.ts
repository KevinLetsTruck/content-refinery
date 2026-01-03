import { NextRequest, NextResponse } from "next/server";
import { GammaClient } from "@/lib/gamma/client";
import { LETSTRUCK_THEME_ID } from "@/lib/gamma/brand-rules";
import prisma from "@/lib/db/prisma";

/**
 * POST /api/gamma/generate
 * Generate a social media visual using Gamma API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      contentId,      // Optional: Link to GeneratedContent record
      text,           // Required: The content to visualize
      contentType,    // Optional: quote, stat, testimonial, teaser, etc.
      outputType,     // Optional: social_post (default), presentation, document
      waitForResult,  // Optional: true to poll until complete
      additionalInstructions, // Optional: Extra instructions for this generation
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.GAMMA_API_KEY) {
      return NextResponse.json(
        { error: "Gamma API key not configured" },
        { status: 500 }
      );
    }

    const gamma = new GammaClient();

    // Build content-type-specific instructions
    let typeInstructions = "";
    switch (contentType) {
      case "quote":
        typeInstructions = "Create a bold quote card with the text prominently displayed. Use the orange accent bar on the left side.";
        break;
      case "stat":
        typeInstructions = "Create a stat-focused graphic with the number very large and prominent in orange. Supporting text below.";
        break;
      case "testimonial":
        typeInstructions = "Create an authentic testimonial card. Emphasize the transformation. Keep it believable, not salesy.";
        break;
      case "teaser":
        typeInstructions = "Create a story teaser that builds curiosity. Use suspenseful imagery. Don't give away the ending.";
        break;
      case "tip":
        typeInstructions = "Create an actionable tip card. Clear, direct, easy to scan. Number if part of a series.";
        break;
      case "product":
        typeInstructions = "Create a product spotlight. Focus on benefits, not features. Tie to driver lifestyle.";
        break;
      default:
        typeInstructions = "Create engaging social media content for professional drivers.";
    }

    const fullInstructions = [
      typeInstructions,
      additionalInstructions || "",
    ].filter(Boolean).join("\n\n");

    // Start generation
    const { generationId } = await gamma.generate({
      inputText: text,
      outputType: outputType || "social_post",
      themeId: LETSTRUCK_THEME_ID,
      additionalInstructions: fullInstructions,
      imageOptions: {
        source: "aiGenerated",
        style: "photorealistic",
      },
      textOptions: {
        amount: "brief",
        tone: "direct, confident, no-BS",
        audience: "professional drivers, owner-operators",
      },
    });

    console.log(`[Gamma] Started generation: ${generationId}`);

    // If waitForResult, poll until complete
    if (waitForResult) {
      const result = await gamma.waitForCompletion(generationId);
      
      // If contentId provided, update the record with the Gamma URL
      if (contentId && result.gammaUrl) {
        await prisma.generatedContent.update({
          where: { id: contentId },
          data: {
            mediaUrl: result.gammaUrl,
            metadata: {
              gammaGenerationId: generationId,
              gammaUrl: result.gammaUrl,
              generatedAt: new Date().toISOString(),
            },
          },
        });
      }

      return NextResponse.json({
        success: true,
        generationId,
        status: result.status,
        gammaUrl: result.gammaUrl,
        credits: result.credits,
      });
    }

    // Return immediately with generation ID
    return NextResponse.json({
      success: true,
      generationId,
      status: "pending",
      message: "Generation started. Use GET /api/gamma/generate?id=xxx to check status.",
    });

  } catch (error) {
    console.error("[Gamma] Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gamma/generate?id=xxx
 * Check status of a generation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get("id");

    if (!generationId) {
      return NextResponse.json(
        { error: "id query parameter required" },
        { status: 400 }
      );
    }

    if (!process.env.GAMMA_API_KEY) {
      return NextResponse.json(
        { error: "Gamma API key not configured" },
        { status: 500 }
      );
    }

    const gamma = new GammaClient();
    const status = await gamma.checkStatus(generationId);

    return NextResponse.json(status);

  } catch (error) {
    console.error("[Gamma] Status check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
