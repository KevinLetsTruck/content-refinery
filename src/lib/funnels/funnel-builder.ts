/**
 * Funnel Builder Orchestrator
 * Main function that creates a complete marketing funnel
 */

import Anthropic from "@anthropic-ai/sdk";
import { Funnel, CreateFunnelInput, FunnelType } from "./types";
import {
  createFunnel as saveFunnel,
  updateFunnel,
} from "./storage";
import { uploadLeadMagnet } from "./lead-magnet";
import { generateEmailSequence } from "./email-generator";
import { generateSocialPosts } from "./social-generator";
import { saveLandingPage } from "@/lib/landing-pages/storage";
import { LandingPageData, LandingPageTemplate } from "@/lib/landing-pages/types";
import { getConstantContactClient } from "@/lib/constant-contact/client";

const anthropic = new Anthropic();

const BASE_URL = "https://content-refinery-07dc.onrender.com";

/**
 * Main orchestrator that creates the complete funnel
 */
export async function createFunnel(input: CreateFunnelInput): Promise<Funnel> {
  // 1. Generate a unique funnel ID
  const funnelId = `funnel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[Funnel] Starting creation: ${funnelId}`);

  // 2. Create initial funnel record with status "generating"
  const slug = slugify(input.name);
  const landingPageUrl = `${BASE_URL}/lp/${slug}`;

  const initialFunnel = saveFunnel({
    id: funnelId,
    name: input.name,
    type: input.type,
    status: "generating",
    goal: input.goal,
    landingPage: {
      slug,
      headline: input.landingPage.headline || "",
      benefits: input.landingPage.benefits || [],
      ctaText: input.landingPage.ctaText || getDefaultCtaText(input.type),
      template: input.type as LandingPageTemplate,
    },
    emailSequence: {
      listId: "",
      listName: "",
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

  console.log(`[Funnel] Initial record created: ${funnelId}`);

  try {
    // 3. Handle lead magnet (one of three options)
    let leadMagnetUrl = "";
    let leadMagnetTitle = input.topic;
    let leadMagnetData: Funnel["leadMagnet"] | undefined;

    if (input.leadMagnetUrl) {
      // Option A: Use external URL directly
      console.log(`[Funnel] Using external lead magnet URL`);
      leadMagnetUrl = input.leadMagnetUrl;
      leadMagnetData = {
        title: input.topic,
        description: `Free guide about ${input.topic}`,
        fileUrl: leadMagnetUrl,
      };
    } else if (input.leadMagnetFile) {
      // Option B: Upload the file
      console.log(`[Funnel] Uploading lead magnet file`);
      const uploadResult = await uploadLeadMagnet(input.leadMagnetFile, funnelId);
      leadMagnetUrl = uploadResult.url;
      leadMagnetData = {
        title: input.leadMagnetFile.name,
        description: `Free guide about ${input.topic}`,
        fileUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        fileType: uploadResult.fileType,
      };
    } else if (input.generateLeadMagnet) {
      // Option C: Generate with Gamma (TODO)
      console.log(`[Funnel] Gamma generation not yet implemented, skipping lead magnet`);
      leadMagnetTitle = input.generateLeadMagnet.title;
      // For now, we'll leave leadMagnetUrl empty and the landing page will need to be updated later
    }

    // 4. Generate landing page content with Claude (if needed)
    console.log(`[Funnel] Generating landing page content`);
    const landingPageContent = await generateLandingPageContent({
      topic: input.topic,
      type: input.type,
      headline: input.landingPage.headline,
      benefits: input.landingPage.benefits,
      ctaText: input.landingPage.ctaText,
      leadMagnetTitle,
    });

    // 5. Save landing page
    console.log(`[Funnel] Saving landing page: ${slug}`);
    const landingPageData: LandingPageData = {
      slug,
      template: input.type as LandingPageTemplate,
      status: "published",
      title: `${landingPageContent.headline} | Let's Truck`,
      metaDescription: landingPageContent.subheadline,
      headline: landingPageContent.headline,
      subheadline: landingPageContent.subheadline,
      benefits: landingPageContent.benefits,
      trustElements: [
        "Join 4,000+ drivers on this journey",
        "Created by Kevin Rutherford, host of Let's Truck",
        "Based on ancestral health science",
      ],
      leadMagnet: leadMagnetUrl
        ? {
            title: leadMagnetTitle,
            description: `Your free guide to ${input.topic}`,
            downloadUrl: leadMagnetUrl,
          }
        : undefined,
      ctaText: landingPageContent.ctaText,
      ctaSubtext: "No spam. Unsubscribe anytime.",
      formFields: ["email", "firstName"],
      constantContactListId: "", // Will be set after CC list creation
      thankYou: {
        headline: getThankYouHeadline(input.type),
        message: getThankYouMessage(input.type),
        ctas: [
          {
            text: "Download the AudioRoad App",
            url: "https://apps.apple.com/us/app/letstruck/id1613223362",
            style: "primary",
          },
          {
            text: "Join the Let's Truck Tribe",
            url: "https://letstrucktribe.com",
            style: "secondary",
          },
        ],
      },
      utmCampaign: slug,
      primaryColor: "#1e40af",
      accentColor: "#f59e0b",
      darkMode: input.type === "challenge",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      conversions: 0,
    };

    saveLandingPage(landingPageData);

    // 6. Handle Constant Contact list
    console.log(`[Funnel] Setting up Constant Contact list`);
    let ccListId = "";
    let ccListName = input.name;

    try {
      const ccClient = getConstantContactClient();
      const isAuth = await ccClient.isAuthenticated();
      if (isAuth) {
        console.log(`[Funnel] Creating CC list: ${input.name}`);
        const list = await ccClient.createList(
          input.name,
          `Subscribers from ${input.name} funnel`
        );
        ccListId = list.list_id;
        ccListName = list.name;
        console.log(`[Funnel] CC list created: ${ccListId}`);

        // Update landing page with CC list ID
        landingPageData.constantContactListId = ccListId;
        saveLandingPage(landingPageData);
      } else {
        console.log(`[Funnel] CC not authenticated, skipping list creation`);
      }
    } catch (error) {
      console.log(`[Funnel] CC list creation failed, will need manual setup:`, error);
      // Continue without CC - can be set up manually later
    }

    // 7. Generate email sequence
    console.log(`[Funnel] Generating email sequence`);
    const emailCount = input.emailCount || 5;
    const emails = await generateEmailSequence({
      funnelName: input.name,
      funnelType: input.type,
      topic: input.topic,
      leadMagnetTitle,
      landingPageUrl,
      emailCount,
    });
    console.log(`[Funnel] Generated ${emails.length} emails`);

    // 8. Generate social posts
    console.log(`[Funnel] Generating social posts`);
    const posts = await generateSocialPosts({
      funnelName: input.name,
      topic: input.topic,
      landingPageUrl,
      platforms: input.platforms,
      postsPerDay: input.postsPerDay,
      durationDays: input.durationDays,
      leadMagnetTitle,
    });
    console.log(`[Funnel] Generated ${posts.length} social posts`);

    // 9. Update funnel with all generated content
    console.log(`[Funnel] Updating funnel with generated content`);
    const completedFunnel = updateFunnel(funnelId, {
      status: "review",
      leadMagnet: leadMagnetData,
      landingPage: {
        slug,
        headline: landingPageContent.headline,
        subheadline: landingPageContent.subheadline,
        benefits: landingPageContent.benefits,
        ctaText: landingPageContent.ctaText,
        template: input.type as LandingPageTemplate,
      },
      emailSequence: {
        listId: ccListId,
        listName: ccListName,
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

    console.log(`[Funnel] Creation complete: ${funnelId}`);
    return completedFunnel;
  } catch (error) {
    console.error(`[Funnel] Creation failed for ${funnelId}:`, error);

    // Update status to reflect the error
    updateFunnel(funnelId, {
      status: "draft",
    });

    throw error;
  }
}

/**
 * Generate landing page content with Claude
 */
interface LandingPageContentInput {
  topic: string;
  type: FunnelType;
  headline?: string;
  benefits?: string[];
  ctaText?: string;
  leadMagnetTitle: string;
}

interface LandingPageContentOutput {
  headline: string;
  subheadline: string;
  benefits: string[];
  ctaText: string;
}

async function generateLandingPageContent(
  input: LandingPageContentInput
): Promise<LandingPageContentOutput> {
  // If everything is provided, just return it
  if (input.headline && input.benefits && input.benefits.length >= 3) {
    return {
      headline: input.headline,
      subheadline: `Get your free guide to ${input.topic}`,
      benefits: input.benefits,
      ctaText: input.ctaText || getDefaultCtaText(input.type),
    };
  }

  // Generate with Claude
  const prompt = `Generate landing page content for a ${input.type.replace("_", " ")} funnel.

BRAND VOICE (Let's Truck / Kevin Rutherford):
- Authentic, experienced trucker perspective
- Educational but conversational
- Direct and practical - drivers are busy
- Use "driver" or "owner-operator" NOT "trucker"
- Challenge mainstream nutrition advice
- Confident, no-BS tone

TOPIC: ${input.topic}
LEAD MAGNET: ${input.leadMagnetTitle}

${input.headline ? `USE THIS HEADLINE: ${input.headline}` : "Generate a compelling headline that creates curiosity and addresses a pain point."}

${input.benefits?.length ? `USE THESE BENEFITS:\n${input.benefits.join("\n")}` : "Generate 5 benefit statements that:"}
- Start with action verbs or "Why/How/What"
- Are specific and tangible
- Address driver pain points
- Create curiosity about the content

Return JSON:
{
  "headline": "...",
  "subheadline": "...",
  "benefits": ["...", "...", "...", "...", "..."],
  "ctaText": "..."
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Extract JSON from the response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to parse landing page content:", content.text);
    throw new Error("Failed to parse landing page content from Claude response");
  }

  const data = JSON.parse(jsonMatch[0]) as LandingPageContentOutput;

  // Apply any overrides
  return {
    headline: input.headline || data.headline,
    subheadline: data.subheadline,
    benefits: input.benefits?.length ? input.benefits : data.benefits,
    ctaText: input.ctaText || data.ctaText || getDefaultCtaText(input.type),
  };
}

/**
 * Convert funnel name to URL slug
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with dashes
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
}

/**
 * Get default CTA text based on funnel type
 */
function getDefaultCtaText(type: FunnelType): string {
  switch (type) {
    case "lead_magnet":
      return "Get My Free Guide";
    case "challenge":
      return "Join the Free Challenge";
    case "product_launch":
      return "Get Early Access";
    default:
      return "Get Started";
  }
}

/**
 * Get thank you page headline based on funnel type
 */
function getThankYouHeadline(type: FunnelType): string {
  switch (type) {
    case "lead_magnet":
      return "Your Guide Is On The Way!";
    case "challenge":
      return "You're In!";
    case "product_launch":
      return "You're On The List!";
    default:
      return "Thank You!";
  }
}

/**
 * Get thank you page message based on funnel type
 */
function getThankYouMessage(type: FunnelType): string {
  switch (type) {
    case "lead_magnet":
      return "Check your email in the next 5 minutes. While you wait...";
    case "challenge":
      return "Check your email for your Day 1 instructions. The challenge starts Monday.";
    case "product_launch":
      return "You'll be the first to know when we launch. In the meantime...";
    default:
      return "We'll be in touch soon.";
  }
}
