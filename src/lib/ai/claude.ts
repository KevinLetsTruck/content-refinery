import Anthropic from "@anthropic-ai/sdk";
import { extractJsonFromText } from "@/lib/utils/api";

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  return new Anthropic({ apiKey });
}

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
  const anthropic = getAnthropicClient();
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

  // Use robust JSON extraction
  const { data, error } = extractJsonFromText<Extraction[]>(content.text, "array");
  if (error) {
    console.error("Failed to parse extractions:", error);
    return [];
  }

  return data ?? [];
}

export async function generatePlatformContent(
  extraction: Extraction,
  platform: Platform,
  products?: { name: string; url: string }[]
): Promise<GeneratedContent> {
  const anthropic = getAnthropicClient();
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

  const responseContent = response.content[0];
  if (responseContent.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // Use robust JSON extraction
  const { data, error } = extractJsonFromText<GeneratedContent>(responseContent.text, "object");
  if (error) {
    console.error("Failed to parse generated content:", error);
    return {
      platform,
      text: extraction.text,
    };
  }

  return data ?? { platform, text: extraction.text };
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

// ============================================
// STRATEGIC CONTENT GENERATION
// ============================================

import { 
  OBJECTIVE_CTAS, 
  PILLAR_CONFIG, 
  FORMULA_TEMPLATES,
  PLATFORM_CONFIG,
  ContentPillar,
  ContentFormula,
  BusinessObjective,
  Platform as StrategyPlatform,
  checkRedFlags,
  scoreContent,
  ContentScore,
  getRandomCta,
  getPillarHashtags,
} from "@/lib/content/strategy";

import { buildStrategicPrompt } from "@/lib/ai/prompts";

export interface StrategicContentRequest {
  sourceText: string;
  platform: StrategyPlatform;
  pillar: ContentPillar;
  formula: ContentFormula;
  objective: BusinessObjective;
  ctaKeyword?: string;
}

export interface StrategicContentResult {
  text: string;
  hashtags: string[];
  cta: string;
  score: ContentScore;
  formula: string;
  pillar: string;
  hookType?: string;
}

export async function generateStrategicContent(
  request: StrategicContentRequest
): Promise<StrategicContentResult> {
  const anthropic = getAnthropicClient();
  
  const pillarConfig = PILLAR_CONFIG[request.pillar];
  const formulaConfig = FORMULA_TEMPLATES[request.formula];
  const platformConfig = PLATFORM_CONFIG[request.platform];
  const ctas = OBJECTIVE_CTAS[request.objective].map(cta => 
    cta.replace("{KEYWORD}", request.ctaKeyword || "GUIDE")
  );
  const hashtags = getPillarHashtags(request.pillar);
  
  const prompt = buildStrategicPrompt({
    platform: request.platform,
    pillar: pillarConfig.name,
    pillarMessage: pillarConfig.keyMessage,
    formula: formulaConfig.name,
    formulaStructure: formulaConfig.structure,
    objective: request.objective,
    ctas,
    hashtags,
    sourceText: request.sourceText,
    charLimit: platformConfig.charLimit,
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });
  
  const strategicContent = response.content[0];
  if (strategicContent.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // Use robust JSON extraction
  const { data: parsedResult, error: parseError } = extractJsonFromText<{
    text: string;
    hashtags: string[];
    hookType?: string;
  }>(strategicContent.text, "object");

  const result = parsedResult ?? {
    text: request.sourceText,
    hashtags: hashtags,
  };

  if (parseError) {
    console.error("Failed to parse strategic content:", parseError);
  }
  
  // Score the generated content
  const hasCta = result.text.includes("DM") || 
                 result.text.toLowerCase().includes("link") || 
                 result.text.toLowerCase().includes("bio") ||
                 result.text.toLowerCase().includes("comment");
  
  const score = scoreContent(
    result.text,
    request.platform,
    true, // Assume hook is present (AI was instructed)
    hasCta,
    request.pillar
  );
  
  // Check red flags
  const flagCheck = checkRedFlags(result.text);
  if (!flagCheck.passed) {
    score.issues.push(...flagCheck.flags);
    score.passed = false;
  }
  
  return {
    text: result.text,
    hashtags: result.hashtags || hashtags,
    cta: getRandomCta(request.objective, request.ctaKeyword),
    score,
    formula: formulaConfig.name,
    pillar: pillarConfig.name,
    hookType: result.hookType,
  };
}

export async function scoreContentWithAI(
  text: string,
  platform: StrategyPlatform
): Promise<ContentScore> {
  const anthropic = getAnthropicClient();
  
  const prompt = `
Score this content for ${platform} on a 1-10 scale:

Content:
"${text}"

Score each criterion:
1. Hook Strength (first line stops scroll?) - 30% weight
2. Value Density (every word earns place?) - 25% weight  
3. Brand Voice (sounds like Kevin Rutherford?) - 20% weight
4. CTA Clarity (clear next step?) - 15% weight
5. Platform Fit (right length/style for ${platform}?) - 10% weight

Return JSON:
{
  "hookStrength": number 1-10,
  "valueDensity": number 1-10,
  "brandVoice": number 1-10,
  "ctaClarity": number 1-10,
  "platformFit": number 1-10,
  "issues": ["specific issues found"],
  "suggestions": ["how to improve"]
}
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });
  
  const scoreContent_ = response.content[0];
  if (scoreContent_.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // Use robust JSON extraction
  interface AIScoreResult {
    hookStrength: number;
    valueDensity: number;
    brandVoice: number;
    ctaClarity: number;
    platformFit: number;
    issues?: string[];
    suggestions?: string[];
  }

  const { data: scoreResult, error: scoreError } = extractJsonFromText<AIScoreResult>(
    scoreContent_.text,
    "object"
  );

  if (scoreError || !scoreResult) {
    console.error("Failed to parse AI score:", scoreError);
    // Fallback to basic scoring
    return scoreContent(text, platform, true, true, null);
  }

  // Calculate weighted total
  const totalScore =
    scoreResult.hookStrength * 0.3 +
    scoreResult.valueDensity * 0.25 +
    scoreResult.brandVoice * 0.2 +
    scoreResult.ctaClarity * 0.15 +
    scoreResult.platformFit * 0.1;

  return {
    hookStrength: scoreResult.hookStrength,
    valueDensity: scoreResult.valueDensity,
    brandVoice: scoreResult.brandVoice,
    ctaClarity: scoreResult.ctaClarity,
    platformFit: scoreResult.platformFit,
    totalScore: Math.round(totalScore * 10) / 10,
    passed: totalScore >= 7 && (!scoreResult.issues || scoreResult.issues.length === 0),
    issues: scoreResult.issues || [],
  };
}
