import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { generate, isConfigured } from "@/lib/gamma";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://content-refinery-07dc.onrender.com";

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

const LANDING_PAGE_TEMPLATES: Record<string, {
  gammaPrompt: string;
  defaultHeadline: string;
  defaultSubheadline: string;
  defaultCtaText: string;
}> = {
  lead_magnet: {
    gammaPrompt: `Create a high-converting lead magnet landing page with:
- Bold, attention-grabbing headline that speaks to the driver's pain
- Clear value proposition explaining what they'll learn
- Bullet points highlighting specific benefits (not vague promises)
- Trust indicators (4,000+ drivers, created by Kevin Rutherford)
- Single, prominent email capture form
- Mobile-friendly design optimized for viewing on phones in trucks
- Dark theme with orange/red accents (#FF4500)`,
    defaultHeadline: "Free Guide for Professional Drivers",
    defaultSubheadline: "Get instant access to the strategies that are changing driver health",
    defaultCtaText: "Get My Free Guide",
  },
  challenge: {
    gammaPrompt: `Create an engaging challenge sign-up landing page with:
- Urgency-focused headline about transformation
- Day-by-day breakdown preview
- What they'll achieve by the end
- Community/accountability messaging
- Limited spots urgency element
- Dark theme with orange/red accents (#FF4500)`,
    defaultHeadline: "Join the 7-Day Challenge",
    defaultSubheadline: "Transform your health in just one week",
    defaultCtaText: "Join the Free Challenge",
  },
  waitlist: {
    gammaPrompt: `Create an exclusive waitlist landing page with:
- Coming soon / exclusive access messaging
- Teaser of what's coming
- Early bird benefits for signing up now
- Countdown or launch date if available
- Dark theme with orange/red accents (#FF4500)`,
    defaultHeadline: "Be First to Know",
    defaultSubheadline: "Join the waitlist for exclusive early access",
    defaultCtaText: "Join the Waitlist",
  },
  product_launch: {
    gammaPrompt: `Create a product launch landing page with:
- Problem-agitation-solution structure
- Product benefits and features
- Social proof / testimonials section
- Pricing and guarantee information
- Multiple CTAs throughout
- Dark theme with orange/red accents (#FF4500)`,
    defaultHeadline: "Introducing Your New Solution",
    defaultSubheadline: "Finally, a product made for life on the road",
    defaultCtaText: "Get Started Now",
  },
};

/**
 * POST /api/landing-pages/generate
 * Generate a landing page via Gamma API
 */
export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Gamma API not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { leadMagnetId, template, customizations } = body;

    // Validate required fields
    if (!leadMagnetId) {
      return NextResponse.json(
        { error: "leadMagnetId is required" },
        { status: 400 }
      );
    }

    if (!template || !LANDING_PAGE_TEMPLATES[template]) {
      return NextResponse.json(
        { error: `Invalid template. Must be one of: ${Object.keys(LANDING_PAGE_TEMPLATES).join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch the lead magnet with extracted data
    const leadMagnet = await prisma.leadMagnet.findUnique({
      where: { id: leadMagnetId },
    });

    if (!leadMagnet) {
      return NextResponse.json(
        { error: "Lead magnet not found" },
        { status: 404 }
      );
    }

    const extractedData = (leadMagnet.extractedData as ExtractedData) || {};
    const templateConfig = LANDING_PAGE_TEMPLATES[template];

    // Build content from extracted data and customizations
    const title = customizations?.headline || extractedData.title || leadMagnet.title;
    const subtitle = customizations?.subheadline || extractedData.subtitle || extractedData.summary || "";
    const benefits = customizations?.benefits || extractedData.keyMessages || [];
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

[${templateConfig.defaultCtaText}]
    `.trim();

    console.log(`[Landing Pages] Generating ${template} landing page for lead magnet: ${leadMagnet.title}`);

    // Call Gamma API
    const result = await generate({
      inputText,
      format: "webpage",
      textMode: "generate",
      themeId: LETS_TRUCK_THEME_ID,
      additionalInstructions: templateConfig.gammaPrompt,
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

    // Save landing page to database
    const landingPage = await prisma.landingPage.create({
      data: {
        slug,
        template,
        status: "published",
        title: `${title} | Let's Truck`,
        metaDescription: subtitle || `Free guide for professional drivers from Let's Truck Health Coaching`,
        headline: customizations?.headline || extractedData.title || templateConfig.defaultHeadline,
        subheadline: customizations?.subheadline || extractedData.subtitle || templateConfig.defaultSubheadline,
        benefits: benefits,
        trustElements: [
          "4,000+ drivers in the Let's Truck Tribe",
          "Created by Kevin Rutherford, FNTP",
          "Based on ancestral health science",
        ],
        leadMagnetId: leadMagnetId,
        downloadUrl: leadMagnet.fileUrl,
        ctaText: templateConfig.defaultCtaText,
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
            url: "https://letstruck.com/radio",
            style: "secondary",
          },
        ],
        utmCampaign: `${slug}-${new Date().toISOString().slice(0, 7)}`,
        primaryColor: "#FF4500",
        accentColor: "#f59e0b",
        darkMode: true,
      },
    });

    // Build self-hosted URL
    const selfHostedUrl = `${BASE_URL}/lp/${slug}`;

    console.log(`[Landing Pages] Created landing page: ${slug} at ${selfHostedUrl}`);

    return NextResponse.json({
      success: true,
      landingPage: {
        id: landingPage.id,
        slug: landingPage.slug,
        url: selfHostedUrl,
        template: landingPage.template,
        status: landingPage.status,
        title: landingPage.title,
        headline: landingPage.headline,
        subheadline: landingPage.subheadline,
      },
      gammaId: result.generationId,
      gammaUrl: result.gammaUrl,
    });

  } catch (error) {
    console.error("[Landing Pages] Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate landing page: ${errorMessage}` },
      { status: 500 }
    );
  }
}
