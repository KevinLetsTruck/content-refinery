import { NextRequest, NextResponse } from "next/server";
import { generateLandingPage, generateLeadMagnet, isConfigured } from "@/lib/gamma";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://content-refinery-07dc.onrender.com";
const LETS_TRUCK_THEME_ID = "jg2glj9ae8ah4vv";

interface QuickLandingPageRequest {
  // Guide info
  guideTitle: string;
  guideTopic: string;

  // Landing page content (can be auto-generated from topic)
  headline?: string;
  subheadline?: string;
  benefits?: string[];
  ctaText?: string;

  // Options
  generateGuide?: boolean; // If true, also generate a PDF guide
}

/**
 * POST /api/create/landing-page
 *
 * Generate a quick landing page (and optionally a guide) for a quick post.
 * Unlike the campaign flow, this doesn't require a pre-existing lead magnet.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Gamma API not configured" },
        { status: 503 }
      );
    }

    const body: QuickLandingPageRequest = await request.json();
    const { guideTitle, guideTopic, generateGuide = false } = body;

    if (!guideTitle || !guideTopic) {
      return NextResponse.json(
        { error: "guideTitle and guideTopic are required" },
        { status: 400 }
      );
    }

    console.log(`[Quick Landing Page] Generating for: ${guideTitle}`);

    // Default content based on the guide topic
    const headline = body.headline || `Free Guide: ${guideTitle}`;
    const subheadline = body.subheadline || `Get instant access to proven strategies for ${guideTopic}`;
    const benefits = body.benefits || [
      `Learn the truth about ${guideTopic}`,
      "Actionable steps you can implement today",
      "Backed by real science, not industry propaganda",
      "Designed specifically for life on the road",
    ];
    const ctaText = body.ctaText || "Get My Free Guide";

    let guideUrl: string | undefined;
    let guidePdfUrl: string | undefined;

    // Optionally generate the PDF guide first
    if (generateGuide) {
      console.log(`[Quick Landing Page] Also generating PDF guide...`);
      try {
        const guideResult = await generateLeadMagnet({
          title: guideTitle,
          topic: guideTopic,
          targetAudience: "Professional truck drivers and owner-operators",
          tone: "direct, no-BS, anti-establishment, pro-driver",
          additionalContext: `
            This guide is for Let's Truck Health Coaching, founded by Kevin Rutherford.
            Focus on practical, actionable advice for drivers on the road.
            Challenge conventional medical wisdom where appropriate.
            Include specific tips that work within the constraints of truck driving.
          `,
        });

        guideUrl = guideResult.gammaUrl;
        guidePdfUrl = guideResult.pdfUrl;
        console.log(`[Quick Landing Page] Guide generated: ${guideUrl}`);
      } catch (guideError) {
        console.error("[Quick Landing Page] Guide generation failed:", guideError);
        // Continue without the guide - landing page can still work
      }
    }

    // Generate the landing page
    const landingPageResult = await generateLandingPage({
      headline,
      subheadline,
      benefits,
      ctaText,
      leadMagnetTitle: guideTitle,
      targetAudience: "Professional truck drivers and owner-operators",
      additionalContent: `
        Created by Kevin Rutherford, FNTP - America's Trucking Health Coach
        Join 4,000+ drivers in the Let's Truck Tribe who are taking control of their health.

        IMPORTANT TERMINOLOGY:
        - NEVER say "trucker" - use "driver" or "professional driver"
        - NEVER say "truckers" - use "drivers", "O/Os", "owner-operators"

        Dark theme with orange/red accents (#FF4500)
      `,
    });

    console.log(`[Quick Landing Page] Landing page generated: ${landingPageResult.gammaUrl}`);

    return NextResponse.json({
      success: true,
      landingPage: {
        gammaUrl: landingPageResult.gammaUrl,
        generationId: landingPageResult.generationId,
      },
      guide: guideUrl ? {
        gammaUrl: guideUrl,
        pdfUrl: guidePdfUrl,
      } : undefined,
      // The URL to use in social posts
      url: landingPageResult.gammaUrl,
    });

  } catch (error) {
    console.error("[Quick Landing Page] Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate landing page: ${errorMessage}` },
      { status: 500 }
    );
  }
}
