/**
 * Funnel Builder Orchestrator
 * Main orchestrator that creates the complete funnel
 */

import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuid } from "uuid";
import { Funnel, FunnelEmail, FunnelPost, CreateFunnelInput, FunnelType } from "./types";
import { createFunnel, updateFunnel } from "./storage";
import { uploadLeadMagnet, validateLeadMagnetUrl } from "./lead-magnet";
import { saveLandingPage } from "@/lib/landing-pages/storage";
import { LandingPageData } from "@/lib/landing-pages/types";

// Kevin's voice guidelines
const KEVIN_VOICE = `
You are writing in the voice of Kevin Rutherford, FNTP (Functional Nutritional Therapy Practitioner) and founder of Let's Truck Health Coaching.

VOICE CHARACTERISTICS:
- Direct, no-BS, Larry Winget style
- Uses trucking industry vernacular
- Anti-conventional medicine establishment
- Pro-functional health approach
- Deeply knowledgeable but accessible

KEY PHRASES TO USE:
- "proper human diet"
- "diesel in your blood"
- "owner-operator"
- "The Tribe"
- "NDK Protocol" (Nutrient Dense Keto)

BRAND VOICE:
- Use "driver" or "owner-operator" not "trucker"
- Reference NDK protocol
- Focus on actionable advice
- Challenge mainstream nutrition advice
- Emphasize: animal-based, 70-80% fats, low carb

AVOID:
- Wishy-washy qualifiers ("maybe", "possibly", "might help")
- Corporate speak
- Excessive medical disclaimers
- Anything positive about big pharma
`;

/**
 * Generate slug from funnel name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Get the Anthropic client
 */
function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

/**
 * Generate email nurture sequence with Claude
 */
export async function generateEmailSequence(params: {
  funnelName: string;
  funnelType: FunnelType;
  topic: string;
  leadMagnetTitle: string;
  landingPageUrl: string;
  emailCount: number;
  keyMessages?: string[];
}): Promise<FunnelEmail[]> {
  const anthropic = getAnthropicClient();

  const prompt = `${KEVIN_VOICE}

Generate a ${params.emailCount}-email nurture sequence for a "${params.funnelType}" funnel about "${params.topic}".

The lead magnet is: "${params.leadMagnetTitle}"

Email sequence purposes:
1. Welcome + deliver lead magnet (send immediately)
2. Value + personal story (24 hours later)
3. Problem agitation + solution tease (48 hours later)
4. Case study/testimonial (72 hours later)
5. Soft pitch + clear CTA (96 hours later)
${params.emailCount > 5 ? `6. Overcome objections (120 hours later)
7. Final push + urgency (144 hours later)` : ""}

${params.keyMessages?.length ? `Key messages to incorporate: ${params.keyMessages.join(", ")}` : ""}

For each email, provide:
- subject: compelling subject line (under 50 chars)
- previewText: email preview text (under 100 chars)
- body: full email HTML body with proper formatting
- purpose: brief description of email's role

Return as a JSON array of email objects.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);

    // Map to FunnelEmail format with delays
    const delays = [0, 24, 48, 72, 96, 120, 144];
    return parsed.map((email: any, index: number) => ({
      id: `email_${uuid()}`,
      order: index + 1,
      subject: email.subject,
      previewText: email.previewText,
      body: email.body,
      sendDelay: delays[index] || (index + 1) * 24,
      purpose: email.purpose,
      status: "draft" as const,
    }));
  } catch (error) {
    console.error("Failed to parse email sequence:", error);
    throw new Error("Failed to generate email sequence");
  }
}

/**
 * Generate social posts that drive to landing page
 */
export async function generateSocialPosts(params: {
  funnelName: string;
  topic: string;
  landingPageUrl: string;
  platforms: string[];
  postsPerDay: Record<string, number>;
  durationDays: number;
  keyMessages?: string[];
  leadMagnetTitle?: string;
}): Promise<FunnelPost[]> {
  const anthropic = getAnthropicClient();

  // Calculate total posts needed
  const totalPostsPerPlatform: Record<string, number> = {};
  for (const platform of params.platforms) {
    const perDay = params.postsPerDay[platform] || 1;
    totalPostsPerPlatform[platform] = perDay * params.durationDays;
  }

  const prompt = `${KEVIN_VOICE}

Generate social media posts for a campaign about "${params.topic}".
Lead magnet: "${params.leadMagnetTitle || params.topic}"
Landing page URL: ${params.landingPageUrl}

Campaign duration: ${params.durationDays} days

Generate posts for each platform:
${Object.entries(totalPostsPerPlatform)
  .map(([platform, count]) => `- ${platform}: ${count} posts`)
  .join("\n")}

PLATFORM GUIDELINES:
- Twitter: Max 280 chars, hook first, no hashtags in main text
- Instagram: Hook in first line, 5-10 hashtags at end, emoji sparingly
- Facebook: Conversational, can include link directly, ask questions
- LinkedIn: Professional angle, industry insights, longer form OK

${params.keyMessages?.length ? `Key messages to rotate: ${params.keyMessages.join(", ")}` : ""}

CRITICAL: Every post MUST include a call to action directing to the landing page URL.
Vary the CTAs: "Grab the free guide", "Link in bio", "Get it here: [URL]", etc.

Return as a JSON array of post objects with:
- platform: "twitter" | "facebook" | "instagram" | "linkedin"
- content: the post text with CTA
- hashtags: array of hashtags (without #)
- dayNumber: which day of campaign (1 to ${params.durationDays})`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.map((post: any) => ({
      id: `post_${uuid()}`,
      platform: post.platform,
      content: post.content,
      hashtags: post.hashtags || [],
      dayNumber: post.dayNumber,
      landingPageUrl: params.landingPageUrl,
      status: "draft" as const,
    }));
  } catch (error) {
    console.error("Failed to parse social posts:", error);
    throw new Error("Failed to generate social posts");
  }
}

/**
 * Generate landing page content with Claude
 */
async function generateLandingPageContent(params: {
  topic: string;
  funnelType: FunnelType;
  leadMagnetTitle?: string;
}): Promise<{ headline: string; subheadline: string; benefits: string[] }> {
  const anthropic = getAnthropicClient();

  const prompt = `${KEVIN_VOICE}

Generate landing page content for a "${params.funnelType}" funnel about "${params.topic}".
${params.leadMagnetTitle ? `Lead magnet title: "${params.leadMagnetTitle}"` : ""}

Create:
1. A compelling headline (under 60 chars) that creates curiosity or addresses pain
2. A subheadline (under 120 chars) that supports the headline
3. 5 benefits (each under 100 chars) using "What's Inside" framing

Return as JSON:
{
  "headline": "...",
  "subheadline": "...",
  "benefits": ["...", "...", "...", "...", "..."]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse landing page content:", error);
    // Return defaults
    return {
      headline: `Get the ${params.topic} Guide`,
      subheadline: `Everything you need to know about ${params.topic}`,
      benefits: [
        "Actionable strategies you can use today",
        "Based on real-world experience",
        "Step-by-step guidance",
        "Common mistakes to avoid",
        "Expert insights from Kevin Rutherford",
      ],
    };
  }
}

/**
 * Build complete funnel
 */
export async function buildFunnel(input: CreateFunnelInput): Promise<Funnel> {
  console.log("[FunnelBuilder] Starting funnel build:", input.name);

  // 1. Create initial funnel record with "generating" status
  const slug = generateSlug(input.name);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://content-refinery-07dc.onrender.com";
  const landingPageUrl = `${baseUrl}/lp/${slug}`;

  const initialFunnel = createFunnel({
    name: input.name,
    type: input.type,
    status: "generating",
    goal: input.goal,
    leadMagnet: undefined,
    landingPage: {
      slug,
      headline: input.landingPage.headline || "",
      benefits: input.landingPage.benefits || [],
      ctaText: input.landingPage.ctaText || "Get Free Access",
      template: input.type === "lead_magnet" ? "lead_magnet" : input.type,
    },
    emailSequence: {
      listId: input.listId || "",
      listName: input.listName || input.name,
      emails: [],
    },
    socialCampaign: {
      platforms: input.platforms,
      postsPerDay: input.postsPerDay,
      durationDays: input.durationDays,
      startDate: input.startDate,
      posts: [],
    },
  });

  try {
    // 2. Handle lead magnet
    let leadMagnetTitle = input.topic;
    let leadMagnetUrl = input.leadMagnetUrl;

    if (input.leadMagnetUrl) {
      if (!validateLeadMagnetUrl(input.leadMagnetUrl)) {
        throw new Error("Invalid lead magnet URL");
      }
      leadMagnetUrl = input.leadMagnetUrl;
    }

    // Note: File upload is handled separately via /api/funnels/upload
    // Gamma generation would be handled here if implemented

    // 3. Generate landing page content if not provided
    let landingPageContent = {
      headline: input.landingPage.headline || "",
      subheadline: "",
      benefits: input.landingPage.benefits || [],
    };

    if (!landingPageContent.headline || landingPageContent.benefits.length === 0) {
      console.log("[FunnelBuilder] Generating landing page content...");
      const generated = await generateLandingPageContent({
        topic: input.topic,
        funnelType: input.type,
        leadMagnetTitle: leadMagnetTitle,
      });
      landingPageContent = {
        headline: input.landingPage.headline || generated.headline,
        subheadline: generated.subheadline,
        benefits: input.landingPage.benefits?.length ? input.landingPage.benefits : generated.benefits,
      };
    }

    // 4. Create landing page
    console.log("[FunnelBuilder] Creating landing page...");
    const landingPage: LandingPageData = {
      slug,
      template: input.type === "lead_magnet" ? "lead_magnet" : input.type,
      status: "published",
      title: `${landingPageContent.headline} | Let's Truck`,
      metaDescription: landingPageContent.subheadline,
      headline: landingPageContent.headline,
      subheadline: landingPageContent.subheadline,
      benefits: landingPageContent.benefits,
      leadMagnet: leadMagnetUrl
        ? {
            title: leadMagnetTitle,
            description: `Free ${input.type === "lead_magnet" ? "guide" : "resource"} about ${input.topic}`,
            downloadUrl: leadMagnetUrl,
          }
        : undefined,
      ctaText: input.landingPage.ctaText || "Get Free Access",
      formFields: ["email", "firstName"],
      constantContactListId: input.listId || "",
      thankYou: {
        headline: "You're In!",
        message: "Check your email for your download link.",
        ctas: [
          {
            text: "Download the AudioRoad App",
            url: "https://apps.apple.com/us/app/letstruck/id1613223362",
            style: "primary",
          },
        ],
      },
      utmCampaign: slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      conversions: 0,
    };

    saveLandingPage(landingPage);

    // 5. Generate email sequence
    console.log("[FunnelBuilder] Generating email sequence...");
    const emails = await generateEmailSequence({
      funnelName: input.name,
      funnelType: input.type,
      topic: input.topic,
      leadMagnetTitle: leadMagnetTitle,
      landingPageUrl,
      emailCount: input.emailCount || 5,
    });

    // 6. Generate social posts
    console.log("[FunnelBuilder] Generating social posts...");
    const posts = await generateSocialPosts({
      funnelName: input.name,
      topic: input.topic,
      landingPageUrl,
      platforms: input.platforms,
      postsPerDay: input.postsPerDay,
      durationDays: input.durationDays,
      leadMagnetTitle: leadMagnetTitle,
    });

    // 7. Update funnel with all generated content
    const completedFunnel = updateFunnel(initialFunnel.id, {
      status: "review",
      leadMagnet: leadMagnetUrl
        ? {
            title: leadMagnetTitle,
            description: `Free resource about ${input.topic}`,
            fileUrl: leadMagnetUrl,
          }
        : undefined,
      landingPage: {
        slug,
        headline: landingPageContent.headline,
        subheadline: landingPageContent.subheadline,
        benefits: landingPageContent.benefits,
        ctaText: input.landingPage.ctaText || "Get Free Access",
        template: input.type === "lead_magnet" ? "lead_magnet" : input.type,
      },
      emailSequence: {
        listId: input.listId || "",
        listName: input.listName || input.name,
        emails,
      },
      socialCampaign: {
        platforms: input.platforms,
        postsPerDay: input.postsPerDay,
        durationDays: input.durationDays,
        startDate: input.startDate,
        posts,
      },
    });

    if (!completedFunnel) {
      throw new Error("Failed to update funnel with generated content");
    }

    console.log("[FunnelBuilder] Funnel build complete:", completedFunnel.id);
    return completedFunnel;
  } catch (error) {
    // Update status to draft if generation fails
    updateFunnel(initialFunnel.id, { status: "draft" });
    throw error;
  }
}
