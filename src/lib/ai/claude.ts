import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type ContentType = 
  | "quote" 
  | "stat" 
  | "hot_take" 
  | "story" 
  | "clip" 
  | "product_mention";

export type Platform = 
  | "twitter" 
  | "instagram" 
  | "facebook" 
  | "linkedin" 
  | "tiktok" 
  | "youtube";

export interface Extraction {
  type: ContentType;
  text: string;
  startTime?: number;
  endTime?: number;
  confidence: number;
  productMentions?: string[];
}

export interface GeneratedContent {
  platform: Platform;
  text: string;
  hashtags?: string[];
  mediaGuidance?: string;
}

// Kevin's voice guidelines embedded in prompts
const KEVIN_VOICE = `
You are writing in the voice of Kevin Rutherford, FNTP (Functional Nutritional Therapy Practitioner) and founder of Let's Truck Health Coaching.

VOICE CHARACTERISTICS:
- Direct, no-BS, Larry Winget style
- Uses trucking industry vernacular
- Anti-conventional medicine establishment
- Pro-functional health approach
- Deeply knowledgeable but accessible
- Confrontational when needed
- Uses humor and occasional profanity for emphasis

KEY PHRASES TO USE:
- "proper human diet"
- "diesel in your blood"
- "owner-operator"
- "The Tribe"
- "Real fuel"

AVOID:
- Wishy-washy qualifiers ("maybe", "possibly", "might help")
- Corporate speak
- Excessive medical disclaimers
- Generic health advice
- Anything positive about big pharma

TOPICS KEVIN IS PASSIONATE ABOUT:
- Gut health (70% of truckers have Candida)
- Cardiovascular health (nitric oxide deficiency)
- Blood sugar/insulin resistance
- Sleep deprivation in truckers
- Hormone dysfunction
- Detoxification from diesel exposure
`;

export async function extractContent(transcript: string): Promise<Extraction[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `${KEVIN_VOICE}

You are an expert content analyst. Your job is to extract high-value content pieces from podcast transcripts that can be turned into social media posts.

For each extraction, identify:
1. Type: quote (powerful statement), stat (surprising statistic), hot_take (controversial opinion), story (anecdote), clip (section worth making into audio/video clip), product_mention (reference to a product)
2. The exact text
3. Approximate timestamp range if determinable
4. Confidence level (0-1) that this would make engaging content
5. Any products mentioned

Return JSON array of extractions, sorted by confidence descending.`,
    messages: [
      {
        role: "user",
        content: `Extract high-value content pieces from this transcript:\n\n${transcript}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    // Extract JSON from the response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse extractions:", error);
    return [];
  }
}

export async function generatePlatformContent(
  extraction: Extraction,
  platform: Platform,
  products?: { name: string; url: string }[]
): Promise<GeneratedContent> {
  const platformGuidelines: Record<Platform, string> = {
    twitter: `
      - Max 280 characters (leave room for link if needed)
      - Hook in first line
      - Use line breaks for emphasis
      - No hashtags in main text (add separately)
      - Can suggest thread if content warrants it
    `,
    instagram: `
      - Caption can be longer (up to 2200 chars)
      - Hook in first line (only shows ~125 chars before "more")
      - Use emojis sparingly
      - Include 5-10 relevant hashtags
      - Suggest carousel content if applicable
    `,
    facebook: `
      - Can be longer form
      - More conversational
      - Include question to drive engagement
      - Can include links directly
    `,
    linkedin: `
      - Professional but still Kevin's voice
      - Industry insight angle
      - Can reference trucking business implications
      - Longer form acceptable
    `,
    tiktok: `
      - Hook in first 3 seconds
      - Provide script/talking points
      - Suggest visual elements
      - Keep under 60 seconds guidance
    `,
    youtube: `
      - Short format (under 60 seconds)
      - Strong hook
      - Clear single message
      - Call to action at end
    `,
  };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `${KEVIN_VOICE}

You are creating social media content for the ${platform} platform.

PLATFORM GUIDELINES:
${platformGuidelines[platform]}

${products?.length ? `
PRODUCTS TO POTENTIALLY REFERENCE:
${products.map((p) => `- ${p.name}: ${p.url}`).join("\n")}
Only reference products if naturally relevant to the content.
` : ""}

Return JSON with:
- platform: "${platform}"
- text: the post content
- hashtags: array of hashtags (if applicable)
- mediaGuidance: suggestions for images/video (if applicable)`,
    messages: [
      {
        role: "user",
        content: `Create a ${platform} post from this content:\n\nType: ${extraction.type}\nText: ${extraction.text}`,
      },
    ],
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
    console.error("Failed to parse generated content:", error);
    return {
      platform,
      text: extraction.text,
    };
  }
}

export async function generateBulkContent(
  extraction: Extraction,
  platforms: Platform[],
  products?: { name: string; url: string }[]
): Promise<GeneratedContent[]> {
  const results = await Promise.all(
    platforms.map((platform) =>
      generatePlatformContent(extraction, platform, products)
    )
  );
  return results;
}
