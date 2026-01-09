import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLeadMagnet, generateLandingPage, isConfigured } from "@/lib/gamma";
import { parseAndValidate, errorResponse, badRequest } from "@/lib/utils/api";

// Request validation schemas matching library interfaces
const LeadMagnetOptionsSchema = z.object({
  type: z.literal("leadMagnet"),
  title: z.string().min(1, "Title is required for lead magnet"),
  topic: z.string().min(1, "Topic is required"),
  targetAudience: z.string().optional(),
  tone: z.string().optional(),
  sections: z.array(z.string()).optional(),
  additionalContext: z.string().optional(),
  numPages: z.number().positive().optional(),
});

const LandingPageOptionsSchema = z.object({
  type: z.literal("landingPage"),
  headline: z.string().min(1, "Headline is required for landing page"),
  subheadline: z.string().min(1, "Subheadline is required for landing page"),
  benefits: z.array(z.string()).min(1, "At least one benefit is required"),
  ctaText: z.string().min(1, "CTA text is required"),
  leadMagnetTitle: z.string().min(1, "Lead magnet title is required"),
  targetAudience: z.string().optional(),
  additionalContent: z.string().optional(),
});

const GammaRequestSchema = z.discriminatedUnion("type", [
  LeadMagnetOptionsSchema,
  LandingPageOptionsSchema,
]);

/**
 * POST /api/gamma/generate
 * Generate a lead magnet PDF or landing page via Gamma
 */
export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return errorResponse("Gamma API not configured", 500);
    }

    // Parse and validate request
    const { data, error } = await parseAndValidate(request, GammaRequestSchema);
    if (error || !data) return error ?? badRequest("Invalid request");

    let result;

    if (data.type === "leadMagnet") {
      const { type: _, ...leadMagnetOptions } = data;
      result = await generateLeadMagnet(leadMagnetOptions);
    } else {
      const { type: _, ...landingPageOptions } = data;
      result = await generateLandingPage(landingPageOptions);
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
