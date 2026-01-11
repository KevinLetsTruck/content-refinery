import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { generate, isConfigured } from "@/lib/gamma";

export const runtime = 'nodejs';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://content-refinery-07dc.onrender.com";
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

    console.log(`[Campaign] Gamma content generated: ${result.gammaUrl}`);

    // Create slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50)
      .replace(/-$/, "");

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.landingPage.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create self-hosted landing page in database
    const landingPage = await prisma.landingPage.create({
      data: {
        slug,
        template: "lead_magnet",
        status: "published",
        title: `${title} | Let's Truck`,
        metaDescription: subtitle || `Free guide for professional drivers from Let's Truck Health Coaching`,
        headline: extractedData.title || title,
        subheadline: extractedData.subtitle || subtitle,
        benefits: benefits,
        trustElements: [
          "4,000+ drivers in the Let's Truck Tribe",
          "Created by Kevin Rutherford, FNTP",
          "Based on ancestral health science",
        ],
        leadMagnetId: leadMagnet.id,
        downloadUrl: leadMagnet.fileUrl,
        ctaText: "Get My Free Guide",
        ctaSubtext: "Instant download. No spam. Unsubscribe anytime.",
        formFields: ["email", "firstName"],
        thankYouHeadline: "Your Guide Is Ready!",
        thankYouMessage: "Check your email for the download link. While you wait...",
        thankYouCtas: [
          {
            text: "Join the Let's Truck Tribe",
            url: "https://letstrucktribe.com",
            style: "primary",
          },
          {
            text: "Listen to Let's Truck Radio",
            url: "https://store.letstruck.com/pages/audio-road",
            style: "secondary",
          },
        ],
        utmCampaign: `${slug}-${new Date().toISOString().slice(0, 7)}`,
        primaryColor: "#FF4500",
        accentColor: "#f59e0b",
        darkMode: true,
        campaignId: id,
      },
    });

    // Build self-hosted URL
    const selfHostedUrl = `${BASE_URL}/lp/${slug}`;

    // Update campaign with self-hosted URL
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        productUrl: selfHostedUrl,
      },
    });

    console.log(`[Campaign] Created self-hosted landing page: ${selfHostedUrl}`);

    return NextResponse.json({
      success: true,
      campaign: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        productUrl: updatedCampaign.productUrl,
      },
      landingPage: {
        id: landingPage.id,
        slug: landingPage.slug,
        url: selfHostedUrl,
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
