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
      format,         // Optional: aspect ratio like "1:1", "4:5", "9:16", "16:9", "1.91:1"
      platform,       // Optional: target platform like instagram_feed, facebook, twitter
      outputType,     // Optional: social (default), presentation, document, webpage
      waitForResult,  // Optional: true to poll until complete
      additionalInstructions, // Optional: Extra instructions for this generation
    } = body;

    console.log("[Gamma] Received request:", { 
      textLength: text?.length, 
      contentType, 
      format, 
      platform, 
      outputType,
      waitForResult,
    });

    if (!text) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.GAMMA_API_KEY) {
      console.error("[Gamma] GAMMA_API_KEY not configured in environment");
      return NextResponse.json(
        { error: "Gamma API key not configured. Please add GAMMA_API_KEY to environment variables." },
        { status: 500 }
      );
    }

    const gamma = new GammaClient();

    // Build format-specific instructions based on aspect ratio
    let formatInstructions = "";
    switch (format) {
      case "1:1":
        formatInstructions = "Create a square (1:1) graphic optimized for Instagram feed. 1080×1080 pixels.";
        break;
      case "4:5":
        formatInstructions = "Create a portrait (4:5) graphic optimized for Instagram feed. 1080×1350 pixels.";
        break;
      case "9:16":
        formatInstructions = "Create a vertical (9:16) graphic optimized for Stories/Reels/TikTok. 1080×1920 pixels.";
        break;
      case "16:9":
        formatInstructions = "Create a landscape (16:9) graphic optimized for Twitter/X and YouTube. 1920×1080 pixels.";
        break;
      case "1.91:1":
        formatInstructions = "Create a wide landscape (1.91:1) graphic optimized for Facebook/LinkedIn. 1200×627 pixels.";
        break;
      default:
        formatInstructions = "Create a square social media graphic.";
    }

    // Build platform-specific instructions
    let platformInstructions = "";
    switch (platform) {
      case "instagram_feed":
        platformInstructions = "Optimize for Instagram Feed. Bold visuals, minimal text, eye-catching, scroll-stopping.";
        break;
      case "instagram_story":
        platformInstructions = "Optimize for Instagram Stories. Full-screen vertical, engaging, swipe-up friendly.";
        break;
      case "facebook":
        platformInstructions = "Optimize for Facebook. Clear messaging, shareable, professional but approachable.";
        break;
      case "twitter":
        platformInstructions = "Optimize for Twitter/X. Punchy, high contrast, works well in timeline.";
        break;
      case "linkedin":
        platformInstructions = "Optimize for LinkedIn. Professional, clean, business-appropriate, thought leadership.";
        break;
      case "tiktok":
        platformInstructions = "Optimize for TikTok. Trendy, bold, vertical-first, attention-grabbing.";
        break;
      default:
        platformInstructions = "Optimize for social media sharing.";
    }

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
      case "educational":
        typeInstructions = "Create an actionable tip card. Clear, direct, easy to scan. Number if part of a series.";
        break;
      case "product":
        typeInstructions = "Create a product spotlight. Focus on benefits, not features. Tie to driver lifestyle.";
        break;
      case "hot_take":
        typeInstructions = "Create a bold, provocative statement graphic. High contrast, attention-grabbing, controversial.";
        break;
      case "story":
        typeInstructions = "Create an engaging story visual. Build curiosity, hint at the journey, emotional impact.";
        break;
      default:
        typeInstructions = "Create engaging social media content for professional drivers.";
    }

    // Combine all instructions
    const fullInstructions = [
      formatInstructions,
      platformInstructions,
      typeInstructions,
      additionalInstructions || "",
    ].filter(Boolean).join("\n\n");

    console.log("[Gamma] Full instructions:", fullInstructions.substring(0, 200) + "...");

    // Start generation
    console.log("[Gamma] Calling Gamma API...");
    const { generationId } = await gamma.generate({
      inputText: text,
      outputType: outputType || "social",
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

    console.log(`[Gamma] Started generation successfully: ${generationId}`);

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
