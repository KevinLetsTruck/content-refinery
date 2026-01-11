/**
 * Social Post Generator
 * Generate social posts that drive to landing page
 */

import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuid } from "uuid";
import { FunnelPost } from "./types";

const anthropic = new Anthropic();

interface GenerateSocialPostsParams {
  funnelName: string;
  topic: string;
  landingPageUrl: string;
  platforms: string[];
  postsPerDay: Record<string, number>;
  durationDays: number;
  keyMessages?: string[];
  leadMagnetTitle?: string;
}

const BRAND_VOICE_PROMPT = `
BRAND VOICE (Let's Truck / Kevin Rutherford):
- Authentic, experienced trucker perspective
- Educational but conversational
- Direct and practical - drivers are busy
- Use "driver" or "owner-operator" NOT "trucker" (CRITICAL)
- No CB radio handles or truck nicknames
- Reference NDK (Nutrient Dense Keto) protocol
- Focus on actionable advice
- Challenge mainstream nutrition advice
- Emphasize: animal-based, 70-80% fats, low carb
- Anti-establishment, questioning conventional medical wisdom
- Confident, no-BS tone
`;

const PLATFORM_GUIDELINES: Record<string, string> = {
  twitter: `Twitter/X:
- Max 280 characters (leave room for link)
- Hook in first line
- Use line breaks for readability
- 1-3 hashtags max
- Thread for longer content`,

  facebook: `Facebook:
- 100-250 words ideal
- Tell a story or ask a question
- Emojis sparingly
- 2-5 hashtags
- Engage in comments`,

  instagram: `Instagram:
- 125-150 words for caption
- Strong hook in first line (before "more")
- 10-15 relevant hashtags
- Include a clear CTA
- Emojis enhance engagement`,

  linkedin: `LinkedIn:
- Professional tone but still conversational
- 150-300 words
- Hook in first line
- Industry insights work well
- 3-5 hashtags
- Tag relevant people/companies`,
};

/**
 * Generate social posts for all platforms
 */
export async function generateSocialPosts(
  params: GenerateSocialPostsParams
): Promise<FunnelPost[]> {
  const {
    funnelName,
    topic,
    landingPageUrl,
    platforms,
    postsPerDay,
    durationDays,
    keyMessages,
    leadMagnetTitle,
  } = params;

  // Calculate total posts needed
  const totalPostsByPlatform: Record<string, number> = {};
  for (const platform of platforms) {
    const perDay = postsPerDay[platform] || 1;
    totalPostsByPlatform[platform] = perDay * durationDays;
  }

  const allPosts: FunnelPost[] = [];

  // Generate posts for each platform
  for (const platform of platforms) {
    const postCount = totalPostsByPlatform[platform];
    const posts = await generatePlatformPosts({
      funnelName,
      topic,
      landingPageUrl,
      platform,
      postCount,
      durationDays,
      keyMessages,
      leadMagnetTitle,
    });
    allPosts.push(...posts);
  }

  return allPosts;
}

interface GeneratePlatformPostsParams {
  funnelName: string;
  topic: string;
  landingPageUrl: string;
  platform: string;
  postCount: number;
  durationDays: number;
  keyMessages?: string[];
  leadMagnetTitle?: string;
}

async function generatePlatformPosts(
  params: GeneratePlatformPostsParams
): Promise<FunnelPost[]> {
  const {
    funnelName,
    topic,
    landingPageUrl,
    platform,
    postCount,
    durationDays,
    keyMessages,
    leadMagnetTitle,
  } = params;

  const platformGuide = PLATFORM_GUIDELINES[platform] || PLATFORM_GUIDELINES.facebook;

  const prompt = `You are writing social media posts for "${funnelName}" - a lead magnet funnel promoting content about ${topic}.

${BRAND_VOICE_PROMPT}

PLATFORM: ${platform.toUpperCase()}
${platformGuide}

CONTEXT:
- Landing Page URL: ${landingPageUrl}
- Lead Magnet: "${leadMagnetTitle || topic}"
${keyMessages ? `- Key Messages: ${keyMessages.join(", ")}` : ""}

Generate ${postCount} unique posts spread across ${durationDays} days.

POST VARIETY - mix these types:
1. Problem awareness (show you understand their struggle)
2. Quick tip/value (actionable advice)
3. Myth busting (challenge conventional wisdom)
4. Story/testimonial (social proof)
5. Direct CTA to download the guide

CRITICAL REQUIREMENTS:
- EVERY post MUST include the FULL landing page URL: ${landingPageUrl}
- The URL must appear in the post text, not just as a link preview
- Use "driver" or "owner-operator" NOT "trucker"
- Vary the hook/opening for each post
- Include relevant hashtags (but prioritize URL over hashtags for character count)
- Assign each post to a day number (1 to ${durationDays})
- For Twitter: Keep under 280 chars INCLUDING the URL and hashtags

Return as JSON array:
[
  {
    "content": "Full post content WITH the URL included",
    "hashtags": ["hashtag1", "hashtag2"],
    "dayNumber": 1
  }
]

MANDATORY: Every post content field MUST contain the exact URL: ${landingPageUrl}
Example: "Your genes are 99.9% identical to ancestors from 40,000 years ago. Your body doesn't know what a Dorito is. Get the free guide: ${landingPageUrl}"`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
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
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Failed to parse social posts:", content.text);
    throw new Error("Failed to parse social posts from Claude response");
  }

  const postData = JSON.parse(jsonMatch[0]) as Array<{
    content: string;
    hashtags: string[];
    dayNumber: number;
  }>;

  // Transform to FunnelPost format, ensuring URL is always included
  const posts: FunnelPost[] = postData.map((post) => {
    let content = post.content;

    // Ensure the landing page URL is in the content
    if (!content.includes(landingPageUrl)) {
      // Add URL if missing - append to end
      const urlSuffix = `\n\n${landingPageUrl}`;
      content = content + urlSuffix;
      console.warn(`[SocialGen] Added missing URL to post for day ${post.dayNumber}`);
    }

    return {
      id: uuid(),
      platform: platform as FunnelPost["platform"],
      content,
      hashtags: post.hashtags,
      dayNumber: post.dayNumber,
      landingPageUrl,
      status: "draft" as const,
    };
  });

  return posts;
}
