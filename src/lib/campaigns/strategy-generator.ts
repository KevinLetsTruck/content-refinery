import Anthropic from "@anthropic-ai/sdk";
import {
  CreateCampaignInput,
  CampaignStrategy,
  CAMPAIGN_TEMPLATES,
} from "./types";

const anthropic = new Anthropic();

const STRATEGY_PROMPT = `You are a campaign strategist for Let's Truck, a health coaching brand for professional truck drivers.

BRAND VOICE:
- Direct, tough-love style like Dave Ramsey
- No-BS approach like Larry Winget  
- Clinical credibility (Kevin is an FNTP - Functional Nutritional Therapy Practitioner)
- Terms: "driver", "professional driver", "O/O", "owner-operator", "The Tribe"
- NEVER use: "trucker", "truckers"
- Signature phrases: "You're the owner-operator of your own health", "Proper human diet"

CONTENT PILLARS (use these themes):
- Proper Human Diet (Paleo-based nutrition)
- Gut Health (70% of drivers have Candida overgrowth)
- Sleep Optimization (drivers average 4.78 hours/night)
- Detoxification (diesel exhaust, environmental toxins)
- Mental Performance (focus, decision-making)

PROVEN CONTENT FORMULAS (vary these throughout campaign):
- Data Bomb: Lead with shocking statistic
- Tough Love: Direct confrontation of bad habits
- Transformation: Before/after story arc
- Contrarian: Challenge conventional wisdom
- Protocol: Step-by-step actionable guide
- Myth Buster: Debunk common misconceptions
- Insider Secret: "What the industry won't tell you"

HOOK TYPES (vary these):
- Shocking stat: "70% of drivers test positive for..."
- Direct challenge: "Stop lying to yourself about..."
- Question: "Why do drivers age faster than..."
- Contrarian: "Everything you know about X is wrong"
- Story: "I had a driver tell me..."
- Authority: "After working with 500+ drivers..."

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

  // Calculate total posts needed
  const totalPosts = input.durationDays * (
    input.postsPerDay.twitter + 
    input.postsPerDay.facebook + 
    input.postsPerDay.instagram
  );

  const userPrompt = `Create a complete ${input.campaignType.replace("_", " ")} campaign.

CAMPAIGN DETAILS:
- Name: ${input.name}
- Goal: ${input.goal}
- Product/Topic: ${input.productName || input.topic || "General health coaching"}
- CTA URL: ${input.productUrl || "https://letstruck.com"}
- Key Messages to Include: ${input.keyMessages.length > 0 ? input.keyMessages.join("; ") : "Focus on the product/topic benefits"}
- Duration: ${input.durationDays} days
- Start Date: ${input.startDate}

PHASE STRUCTURE:
${phases.map(p => `- ${p.name} (Days ${p.startDay}-${p.endDay}): ${p.purpose}`).join("\n")}

CONTENT REQUIREMENTS:
- Platforms: ${input.platforms.join(", ")}
- Twitter posts: ${input.postsPerDay.twitter} per day = ${input.durationDays * input.postsPerDay.twitter} total
- Facebook posts: ${input.postsPerDay.facebook} per day = ${input.durationDays * input.postsPerDay.facebook} total
- Instagram posts: ${input.postsPerDay.instagram} per day = ${input.durationDays * input.postsPerDay.instagram} total
- YouTube Shorts: ${input.youtubeShorts} total (spread throughout campaign)
- YouTube Standard videos: ${input.youtubeStandard} total
- TOTAL POSTS NEEDED: ${totalPosts}

CRITICAL REQUIREMENTS:
1. Twitter posts MUST be under 280 characters including hashtags
2. Create EXACTLY the number of posts specified above
3. Vary the content formulas and hooks - don't repeat the same style
4. Each phase should have distinct messaging aligned with its purpose
5. Instagram posts should describe a visual concept in visualPrompt
6. Space YouTube content strategically (not all on the same day)

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
      "visualType": "dalle",
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

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: STRATEGY_PROMPT,
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
    
    // Validate Twitter post lengths
    for (const post of strategy.posts) {
      if (post.platform === "twitter") {
        const fullLength = post.content.length + 
          post.hashtags.reduce((sum, tag) => sum + tag.length + 2, 0); // +2 for "# " and space
        
        if (fullLength > 280) {
          console.warn(`[Campaign] Twitter post exceeds 280 chars (${fullLength}), truncating`);
          // Truncate content to fit
          const hashtagLength = post.hashtags.reduce((sum, tag) => sum + tag.length + 2, 0);
          const maxContentLength = 275 - hashtagLength;
          if (post.content.length > maxContentLength) {
            post.content = post.content.substring(0, maxContentLength - 3) + "...";
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
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: STRATEGY_PROMPT,
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



