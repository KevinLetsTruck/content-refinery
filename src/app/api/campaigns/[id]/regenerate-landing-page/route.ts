import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { generate, isConfigured } from "@/lib/gamma";

export const runtime = 'nodejs';

const LETS_TRUCK_THEME_ID = "jg2glj9ae8ah4vv";

interface ExtractedData {
  title?: string;
  subtitle?: string;
  summary?: string;
  keyMessages?: string[];
  stats?: string[];
  hooks?: string[];
  chapters?: string[];
}

/**
 * POST /api/campaigns/[id]/regenerate-landing-page
 * Regenerate and update the landing page for an existing campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Gamma API not configured" },
        { status: 503 }
      );
    }

    // Fetch the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Find the corresponding lead magnet by matching product name
    const leadMagnet = await prisma.leadMagnet.findFirst({
      where: {
        title: campaign.productName || undefined,
      },
    });

    if (!leadMagnet) {
      return NextResponse.json(
        { error: `No lead magnet found matching campaign product: ${campaign.productName}` },
        { status: 404 }
      );
    }

    const extractedData = (leadMagnet.extractedData as ExtractedData) || {};

    // Build content from extracted data
    const title = extractedData.title || leadMagnet.title;
    const subtitle = extractedData.subtitle || extractedData.summary || "";
    const benefits = extractedData.keyMessages || [];
    const hooks = extractedData.hooks || [];
    const stats = extractedData.stats || [];

    // Build the Gamma prompt
    const benefitsList = benefits.map((b: string) => `• ${b}`).join("\n");
    const hooksList = hooks.length > 0 ? `\n\nAttention-grabbing hooks to use:\n${hooks.map((h: string) => `• ${h}`).join("\n")}` : "";
    const statsList = stats.length > 0 ? `\n\nKey statistics to include:\n${stats.map((s: string) => `• ${s}`).join("\n")}` : "";

    const inputText = `
# ${title}

${subtitle}

## What You'll Learn:
${benefitsList}
${hooksList}
${statsList}

## Download Link
${leadMagnet.fileUrl}

## Brand Info
Let's Truck Health Coaching - America's Trucking Health Coach
Dark theme, orange/red accents (#FF4500)
Target audience: Professional truck drivers, owner-operators
Voice: Direct, no-BS, pro-driver, anti-establishment

[Get My Free Guide]
    `.trim();

    console.log(`[Campaign] Regenerating landing page for campaign: ${campaign.name}`);

    // Call Gamma API
    const result = await generate({
      inputText,
      format: "webpage",
      textMode: "generate",
      themeId: LETS_TRUCK_THEME_ID,
      additionalInstructions: `Create a high-converting lead magnet landing page with:
- Bold, attention-grabbing headline that speaks to the driver's pain
- Clear value proposition explaining what they'll learn
- Bullet points highlighting specific benefits (not vague promises)
- Trust indicators (4,000+ drivers, created by Kevin Rutherford)
- Single, prominent email capture form
- Mobile-friendly design optimized for viewing on phones in trucks
- Dark theme with orange/red accents (#FF4500)`,
      textOptions: {
        amount: "medium",
        tone: "direct, persuasive, no-BS",
        audience: "professional truck drivers and owner-operators",
        language: "en",
      },
      imageOptions: {
        source: "aiGenerated",
        model: "imagen-4-pro",
        style: "photorealistic",
      },
    });

    console.log(`[Campaign] Gamma landing page generated: ${result.gammaUrl}`);

    // Update the campaign with the new Gamma URL
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        productUrl: result.gammaUrl,
      },
    });

    console.log(`[Campaign] Updated campaign ${id} with landing page URL: ${result.gammaUrl}`);

    return NextResponse.json({
      success: true,
      campaign: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        productUrl: updatedCampaign.productUrl,
      },
      gammaId: result.generationId,
      gammaUrl: result.gammaUrl,
    });

  } catch (error) {
    console.error("[Campaign] Landing page regeneration error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to regenerate landing page: ${errorMessage}` },
      { status: 500 }
    );
  }
}
