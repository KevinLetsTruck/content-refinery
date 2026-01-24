import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generate, generateLeadMagnet, generateLandingPage, isConfigured } from "@/lib/gamma";
import { errorResponse, badRequest } from "@/lib/utils/api";
import { GAMMA_BRAND_INSTRUCTIONS } from "@/lib/gamma/brand-rules";

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

// Social media visual schema (used by the wizard)
const SocialVisualOptionsSchema = z.object({
  text: z.string().min(1, "Text content is required"),
  contentType: z.string().optional().default("quote"),
  platform: z.string().optional(),
  dimensions: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  waitForResult: z.boolean().optional().default(true),
});

/**
 * Determine if request is for social visual (no type field, has text field)
 */
function isSocialVisualRequest(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return "text" in obj && !("type" in obj);
}

/**
 * POST /api/gamma/generate
 * Generate a lead magnet PDF, landing page, or social media visual via Gamma
 */
export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return errorResponse("Gamma API not configured", 500);
    }

    // Get raw JSON first to determine request type
    const rawBody = await request.json();

    // Handle social media visual generation (wizard flow)
    if (isSocialVisualRequest(rawBody)) {
      const parsed = SocialVisualOptionsSchema.safeParse(rawBody);
      if (!parsed.success) {
        return badRequest(parsed.error.message);
      }

      const { text, contentType, platform, dimensions } = parsed.data;

      // Determine aspect ratio instruction based on platform/dimensions
      let aspectRatioInstruction = "";
      if (dimensions) {
        const ratio = dimensions.width && dimensions.height
          ? `${dimensions.width}x${dimensions.height}`
          : "";
        aspectRatioInstruction = ratio ? `Target dimensions: ${ratio} pixels.` : "";
      }

      // Map content type to visual style
      const visualInstructions: Record<string, string> = {
        quote: "Create a bold quote card with the text prominently displayed. Use an orange accent bar on the left side.",
        stat: "Create a statistic highlight with the number large and prominent in orange. Include supporting context.",
        hot_take: "Create an attention-grabbing controversial statement card. Bold, direct, designed to make people stop scrolling.",
        story: "Create an engaging story teaser card with visual intrigue.",
        tip: "Create an actionable tip card with clear, scannable formatting.",
        testimonial: "Create a testimonial/success story card with an authentic feel.",
        default: "Create a professional social media visual that captures attention.",
      };

      const styleInstruction = visualInstructions[contentType || "default"] || visualInstructions.default;

      // Build the prompt for Gamma
      const inputText = `
Social Media Visual for ${platform || "social media"}

Content:
${text}

Style: ${styleInstruction}
${aspectRatioInstruction}

Create a single, high-impact visual that works for social media. The text should be the focus - make it readable and impactful.
      `.trim();

      // Generate the visual
      const result = await generate({
        inputText,
        format: "social",
        textMode: "generate",
        additionalInstructions: `
${GAMMA_BRAND_INSTRUCTIONS}

Additional requirements:
- Dark background (#0D0D0D or similar)
- Orange accent color (#FF4500)
- Bold, readable typography
- Professional driver / trucking context
- ${styleInstruction}
        `,
        textOptions: {
          amount: "brief",
          tone: "direct, confident, no-BS",
          audience: "professional drivers, owner-operators",
          language: "en",
        },
        imageOptions: {
          source: "aiGenerated",
          model: "imagen-4-pro",
          style: "photorealistic",
        },
      });

      return NextResponse.json({
        success: true,
        id: result.generationId,
        status: result.status,
        gammaUrl: result.gammaUrl,
        imageUrl: result.gammaUrl, // Gamma URL can be used as preview
        exportUrl: result.pdfUrl || result.pptxUrl,
      });
    }

    // Handle typed requests (leadMagnet or landingPage)
    const TypedRequestSchema = z.discriminatedUnion("type", [
      LeadMagnetOptionsSchema,
      LandingPageOptionsSchema,
    ]);

    const parsed = TypedRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const data = parsed.data;
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
