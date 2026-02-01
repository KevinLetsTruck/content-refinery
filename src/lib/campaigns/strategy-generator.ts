import Anthropic from "@anthropic-ai/sdk";
import {
  CreateCampaignInput,
  CampaignStrategy,
  CAMPAIGN_TEMPLATES,
  ContentCategory,
} from "./types";

const anthropic = new Anthropic();

// Category-specific content guidance
const CATEGORY_CONTENT: Record<ContentCategory, string> = {
  health: `
CONTENT FOCUS: HEALTH
This campaign is about HEALTH topics. Use health-related content pillars:
- Proper Human Diet (Paleo-based nutrition)
- Gut Health (70% of drivers have Candida overgrowth)
- Sleep Optimization (drivers average 4.78 hours/night)
- Detoxification (diesel exhaust, environmental toxins)
- Mental Performance (focus, decision-making)

Signature phrases for health content:
- "You're the owner-operator of your own health"
- "Proper human diet"
- "Your body, your rig"
`,

  business: `
CONTENT FOCUS: BUSINESS
This campaign is about TRUCKING BUSINESS topics. Use business-related content pillars:
- Fuel Efficiency & MPG Optimization
- Cost Per Mile & Profitability
- Owner-Operator Business Operations
- Rates & Revenue Management
- Equipment & Maintenance

Signature phrases for business content:
- "Run your trucking business like a business"
- "Know your numbers"
- "Every mile, every load, every expense"
- "Be the CEO of your one-truck company"

HOOK TYPES for business:
- Shocking stat: "The average O/O loses $0.12 per mile without knowing it"
- Direct challenge: "Do you actually know your cost per mile?"
- Question: "How many miles did you run for free last month?"
- Contrarian: "Low rates aren't killing your business. Bad math is."
`,

  industry: `
CONTENT FOCUS: INDUSTRY
This campaign is about INDUSTRY NEWS/REGULATIONS. Use industry-related content pillars:
- FMCSA Regulations & Compliance
- Industry News & Trends
- Market Analysis & Freight Trends
- ELD, HOS, and Compliance Updates

Signature phrases for industry content:
- "Know the rules before the rules know you"
- "Stay compliant, stay profitable"
- "The industry is changing - here's what matters"
`,

  lifestyle: `
CONTENT FOCUS: LIFESTYLE
This campaign is about DRIVER LIFESTYLE. Use lifestyle-related content pillars:
- Life on the Road
- Driver Community & Support
- Work-Life Balance
- The Tribe Mentality

Signature phrases for lifestyle content:
- "The Tribe"
- "Diesel in your blood"
- "This life isn't for everyone. But for us, there's nothing else."
`,

  fiction: `
CONTENT FOCUS: FICTION (TRUCKTALES)
This campaign is about TRUCKTALES FICTION. Use storytelling approaches:
- Character introductions
- Story teasers and cliffhangers
- Behind-the-scenes of story creation
- Reader engagement and anticipation building

Signature phrases for fiction content:
- "Stories from the road"
- "The stories that only we understand"
`,

  general: `
CONTENT FOCUS: GENERAL
Adapt content to the specific topic provided. Use appropriate hooks and CTAs based on the subject matter.
`,
};

function buildStrategyPrompt(category: ContentCategory = "general"): string {
  return `You are a campaign strategist for Let's Truck, founded by Kevin Rutherford.

BRAND VOICE:
- Direct, tough-love style like Dave Ramsey
- No-BS approach like Larry Winget
- Terms: "driver", "professional driver", "O/O", "owner-operator", "The Tribe"
- NEVER use: "trucker", "truckers"
- Confident, authoritative tone

${CATEGORY_CONTENT[category]}

PROVEN CONTENT FORMULAS (vary these throughout campaign):
- Data Bomb: Lead with shocking statistic
- Tough Love: Direct confrontation of bad habits
- Transformation: Before/after story arc
- Contrarian: Challenge conventional wisdom
- Protocol: Step-by-step actionable guide
- Myth Buster: Debunk common misconceptions
- Insider Secret: "What the industry won't tell you"

PLATFORM GUIDELINES:
- Twitter: Under 280 characters, punchy, use 2-3 relevant hashtags
- Facebook: 150-300 words, storytelling, ask questions for engagement
- Instagram: Visual-first, use emojis sparingly, 5-10 hashtags at end
- YouTube Shorts: 30-60 sec scripts, hook in first 3 seconds, vertical format

CTA TYPES (match to campaign goal):
- Email signup: "Grab the free guide", "Get the protocol"
- Sales: "Join now", "Get started today", "Claim your spot"
- Awareness: "Share this with a driver who needs it", "Save this"
- Engagement: "Drop a 🔥 if you agree", "Tell me in the comments"

OUTPUT: Return ONLY valid JSON, no markdown, no explanation.`;
}

/**
 * Auto-detect content category from topic/product name
 */
function detectContentCategory(topicOrProduct: string): ContentCategory {
  const text = topicOrProduct.toLowerCase();

  // Health keywords
  const healthKeywords = [
    "health", "nutrition", "diet", "gut", "candida", "sleep", "weight",
    "blood sugar", "insulin", "hormone", "detox", "supplement", "vitamin",
    "energy", "fatigue", "cardio", "heart", "cholesterol", "a1c", "diabetes",
    "keto", "paleo", "fasting", "meal", "food", "eat", "probiotic"
  ];

  // Business keywords
  const businessKeywords = [
    "fuel", "mpg", "mileage", "cost per mile", "cpm", "profit", "revenue",
    "rates", "freight", "load", "broker", "dispatch", "business", "money",
    "expense", "tax", "accounting", "maintenance", "equipment", "truck",
    "trailer", "tire", "owner operator", "o/o", "leasing", "authority"
  ];

  // Industry keywords
  const industryKeywords = [
    "fmcsa", "regulation", "compliance", "eld", "hos", "hours of service",
    "dot", "inspection", "csa", "safety", "law", "rule", "mandate",
    "industry", "market", "trend", "news", "update", "change"
  ];

  // Fiction keywords
  const fictionKeywords = [
    "story", "trucktales", "fiction", "character", "chapter", "novel",
    "tale", "narrative", "adventure"
  ];

  // Lifestyle keywords
  const lifestyleKeywords = [
    "life on the road", "home time", "family", "relationship", "loneliness",
    "community", "tribe", "lifestyle", "living"
  ];

  // Count matches
  const counts: Record<ContentCategory, number> = {
    health: healthKeywords.filter(k => text.includes(k)).length,
    business: businessKeywords.filter(k => text.includes(k)).length,
    industry: industryKeywords.filter(k => text.includes(k)).length,
    fiction: fictionKeywords.filter(k => text.includes(k)).length,
    lifestyle: lifestyleKeywords.filter(k => text.includes(k)).length,
    general: 0,
  };

  // Find category with most matches
  let maxCategory: ContentCategory = "general";
  let maxCount = 0;

  for (const [category, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxCategory = category as ContentCategory;
    }
  }

  // Log detection result
  console.log(`[Campaign] Detected content category: ${maxCategory} (from: "${topicOrProduct.substring(0, 50)}...")`);

  return maxCategory;
}

export async function generateCampaignStrategy(
  input: CreateCampaignInput
): Promise<CampaignStrategy> {
  const template = CAMPAIGN_TEMPLATES[input.campaignType];
  
  // Calculate phase days
  const phases = template.phases.map((phase, index) => {
    const startDay = index === 0 
      ? 1 
      : template.phases.slice(0, index).reduce(
          (sum, p) => sum + Math.ceil(input.durationDays * p.daysPercent / 100), 
          1
        );
    const duration = Math.ceil(input.durationDays * phase.daysPercent / 100);
    return {
      ...phase,
      startDay,
      endDay: Math.min(startDay + duration - 1, input.durationDays),
    };
  });

  // Calculate total posts needed (only for enabled platforms)
  const totalPosts = input.durationDays * (
    (input.platforms.includes("twitter") ? input.postsPerDay.twitter : 0) +
    (input.platforms.includes("facebook") ? input.postsPerDay.facebook : 0) +
    (input.platforms.includes("instagram") ? input.postsPerDay.instagram : 0)
  );

  // Determine the CTA URL - prioritize landing page URL, then product URL
  const ctaUrl = input.landingPageUrl || input.productUrl || "https://letstruck.com";

  const userPrompt = `Create a complete ${input.campaignType.replace("_", " ")} campaign.

CAMPAIGN DETAILS:
- Name: ${input.name}
- Goal: ${input.goal}
- Product/Topic: ${input.productName || input.topic || "General health coaching"}
- CTA URL: ${ctaUrl}
- Key Messages to Include: ${input.keyMessages.length > 0 ? input.keyMessages.join("; ") : "Focus on the product/topic benefits"}
- Duration: ${input.durationDays} days
- Start Date: ${input.startDate}

PHASE STRUCTURE:
${phases.map(p => `- ${p.name} (Days ${p.startDay}-${p.endDay}): ${p.purpose}`).join("\n")}

CONTENT REQUIREMENTS:
- Platforms: ${input.platforms.join(", ")}
${input.platforms.includes("twitter") ? `- Twitter posts: ${input.postsPerDay.twitter} per day = ${input.durationDays * input.postsPerDay.twitter} total` : "- Twitter: NOT INCLUDED"}
${input.platforms.includes("facebook") ? `- Facebook posts: ${input.postsPerDay.facebook} per day = ${input.durationDays * input.postsPerDay.facebook} total` : "- Facebook: NOT INCLUDED"}
${input.platforms.includes("instagram") ? `- Instagram posts: ${input.postsPerDay.instagram} per day = ${input.durationDays * input.postsPerDay.instagram} total` : "- Instagram: NOT INCLUDED"}
- YouTube Shorts: ${input.youtubeShorts} total (spread throughout campaign)
- YouTube Standard videos: ${input.youtubeStandard} total
- TOTAL POSTS NEEDED: ${totalPosts}
- IMPORTANT: Only generate posts for the platforms listed above that are INCLUDED. Do NOT generate posts for platforms marked as "NOT INCLUDED".

CRITICAL REQUIREMENTS:
1. Twitter posts MUST be under 280 characters including hashtags
2. Create EXACTLY the number of posts specified above
3. Vary the content formulas and hooks - don't repeat the same style
4. Each phase should have distinct messaging aligned with its purpose
5. Instagram posts should describe a visual concept in visualPrompt
6. Space YouTube content strategically (not all on the same day)
7. MANDATORY: EVERY post with a CTA MUST include the ACTUAL URL: ${ctaUrl}
   - Do NOT use placeholders like [URL], [LINK], or "link in bio"
   - Include the full URL in the post content (e.g., "Get the guide: ${ctaUrl}")
   - For Twitter, keep the URL in the content even with character limits

Return this exact JSON structure:
{
  "overview": "2-3 sentence campaign strategy overview",
  "phases": [
    {
      "name": "Phase Name",
      "startDay": 1,
      "endDay": 3,
      "purpose": "What this phase achieves",
      "themes": ["theme1", "theme2"],
      "hooks": ["specific hook idea 1", "specific hook idea 2"],
      "ctas": ["CTA text 1", "CTA text 2"]
    }
  ],
  "posts": [
    {
      "dayNumber": 1,
      "platform": "twitter",
      "contentType": "post",
      "phase": "Phase Name",
      "content": "Full post text (UNDER 280 CHARS FOR TWITTER)",
      "hashtags": ["LetsTruck", "DriverHealth"],
      "visualType": "nano_banana",
      "visualPrompt": "Description for visual generation"
    }
  ],
  "videos": [
    {
      "dayNumber": 3,
      "videoType": "short",
      "title": "Video title for YouTube",
      "purpose": "What this video achieves",
      "script": {
        "hook": "First 3 seconds - attention grabber",
        "body": "Main content - 20-40 seconds",
        "cta": "Call to action - last 5-10 seconds"
      }
    }
  ]
}`;

  // Determine content category from input or detect from topic
  const contentCategory: ContentCategory = input.contentCategory || detectContentCategory(input.topic || input.productName || "");
  const strategyPrompt = buildStrategyPrompt(contentCategory);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: strategyPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  
  // Clean up response - remove any markdown formatting
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const strategy: CampaignStrategy = JSON.parse(jsonStr);

    // Ensure every post has the actual URL (replace placeholders or append)
    for (const post of strategy.posts) {
      // Replace common placeholders with actual URL
      post.content = post.content
        .replace(/\[URL\]/gi, ctaUrl)
        .replace(/\[LINK\]/gi, ctaUrl)
        .replace(/\[CTA_URL\]/gi, ctaUrl)
        .replace(/link in bio/gi, ctaUrl);

      // If URL is not in the post content and it's a CTA-focused post, append it
      if (!post.content.includes(ctaUrl) && !post.content.includes("http")) {
        // Check if this is an awareness/CTA phase post
        const ctaPhrases = ["get the", "grab the", "download", "sign up", "join", "learn more", "check out", "discover"];
        const hasCtaPhrase = ctaPhrases.some(phrase => post.content.toLowerCase().includes(phrase));

        if (hasCtaPhrase) {
          console.warn(`[Campaign] Adding missing URL to post for day ${post.dayNumber} (${post.platform})`);
          post.content = `${post.content}\n\n${ctaUrl}`;
        }
      }

      // Validate Twitter post lengths
      if (post.platform === "twitter") {
        const fullLength = post.content.length +
          post.hashtags.reduce((sum, tag) => sum + tag.length + 2, 0); // +2 for "# " and space

        if (fullLength > 280) {
          console.warn(`[Campaign] Twitter post exceeds 280 chars (${fullLength}), truncating`);
          // Truncate content to fit (but preserve URL)
          const hashtagLength = post.hashtags.reduce((sum, tag) => sum + tag.length + 2, 0);
          const maxContentLength = 275 - hashtagLength;
          if (post.content.length > maxContentLength) {
            // Try to preserve URL when truncating
            if (post.content.includes(ctaUrl)) {
              const urlIndex = post.content.indexOf(ctaUrl);
              const beforeUrl = post.content.substring(0, urlIndex).trim();
              const truncatedBefore = beforeUrl.substring(0, maxContentLength - ctaUrl.length - 5) + "... ";
              post.content = truncatedBefore + ctaUrl;
            } else {
              post.content = post.content.substring(0, maxContentLength - 3) + "...";
            }
          }
        }
      }
    }

    return strategy;
  } catch (error) {
    console.error("[Campaign] Failed to parse strategy JSON:", error);
    console.error("[Campaign] Raw response:", jsonStr.substring(0, 500));
    throw new Error("Failed to generate valid campaign strategy");
  }
}

/**
 * Regenerate a single post within a campaign
 */
export async function regeneratePost(
  campaignContext: {
    name: string;
    goal: string;
    productName?: string;
    topic?: string;
    contentCategory?: ContentCategory;
  },
  post: {
    platform: string;
    phase: string;
    dayNumber: number;
  },
  instruction?: string
): Promise<{
  content: string;
  hashtags: string[];
  visualPrompt: string;
}> {
  // Detect or use provided content category
  const category = campaignContext.contentCategory || detectContentCategory(campaignContext.topic || campaignContext.productName || "");
  const strategyPrompt = buildStrategyPrompt(category);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: strategyPrompt,
    messages: [
      {
        role: "user",
        content: `Regenerate a single ${post.platform} post for this campaign:

Campaign: ${campaignContext.name}
Goal: ${campaignContext.goal}
Product/Topic: ${campaignContext.productName || campaignContext.topic}
Phase: ${post.phase}
Day: ${post.dayNumber}

${instruction ? `Special instruction: ${instruction}` : ""}

Return JSON only:
{
  "content": "Post text",
  "hashtags": ["tag1", "tag2"],
  "visualPrompt": "Visual description"
}

${post.platform === "twitter" ? "CRITICAL: Content must be under 250 characters to leave room for hashtags." : ""}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
  
  return JSON.parse(jsonStr);
}




