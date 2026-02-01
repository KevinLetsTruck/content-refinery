import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Content category type
type ContentCategory = "health" | "business" | "industry" | "lifestyle" | "fiction" | "general";

/**
 * Auto-detect content category from topic/product name and interview answers
 */
function detectContentCategory(
  sourceData: Record<string, unknown>,
  interviewAnswers: Record<string, unknown>,
  sourceContent?: string,
  sourceTitle?: string
): ContentCategory {
  // Combine all text fields for analysis - PRIORITY: sourceContent (what the user actually typed)
  const allText = [
    sourceContent, // THIS IS THE KEY - the actual text the user entered!
    sourceTitle,
    sourceData?.content,
    sourceData?.title,
    sourceData?.topic,
    sourceData?.description,
    sourceData?.idea,
    sourceData?.productName,
    interviewAnswers?.topic,
    interviewAnswers?.description,
    interviewAnswers?.keyMessage,
    interviewAnswers?.goal,
    interviewAnswers?.primaryMessage,
  ].filter(Boolean).join(' ').toLowerCase();

  // Health keywords
  const healthKeywords = [
    "health", "nutrition", "diet", "gut", "candida", "sleep", "weight",
    "blood sugar", "insulin", "hormone", "detox", "supplement", "vitamin",
    "energy", "fatigue", "cardio", "heart", "cholesterol", "a1c", "diabetes",
    "keto", "paleo", "fasting", "meal", "food", "eat", "probiotic", "wellness"
  ];

  // Business keywords
  const businessKeywords = [
    "fuel", "mpg", "mileage", "cost per mile", "cpm", "profit", "revenue",
    "rates", "freight", "load", "broker", "dispatch", "business", "money",
    "expense", "tax", "accounting", "maintenance", "equipment", "truck",
    "trailer", "tire", "owner operator", "o/o", "leasing", "authority",
    "operating cost", "deadhead", "lumper", "detention", "invoice", "cash flow"
  ];

  // Industry keywords
  const industryKeywords = [
    "fmcsa", "regulation", "compliance", "eld", "hos", "hours of service",
    "dot", "inspection", "csa", "safety", "law", "rule", "mandate",
    "industry", "market", "trend", "news", "update", "change", "policy"
  ];

  // Fiction keywords (TruckTales)
  const fictionKeywords = [
    "story", "trucktales", "fiction", "character", "chapter", "novel",
    "tale", "narrative", "adventure"
  ];

  // Lifestyle keywords
  const lifestyleKeywords = [
    "life on the road", "home time", "family", "relationship", "loneliness",
    "community", "tribe", "lifestyle", "living", "road life", "driver life"
  ];

  // Count matches
  const counts: Record<ContentCategory, number> = {
    health: healthKeywords.filter(k => allText.includes(k)).length,
    business: businessKeywords.filter(k => allText.includes(k)).length,
    industry: industryKeywords.filter(k => allText.includes(k)).length,
    fiction: fictionKeywords.filter(k => allText.includes(k)).length,
    lifestyle: lifestyleKeywords.filter(k => allText.includes(k)).length,
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

  console.log(`[WizardStrategy] Detected category: ${maxCategory} (matches: ${maxCount}) from text: "${allText.substring(0, 100)}..."`);

  return maxCategory;
}

// Category-specific brand voice and content focus
const CATEGORY_VOICE: Record<ContentCategory, string> = {
  health: `
CONTENT FOCUS: HEALTH & WELLNESS
This campaign is about HEALTH topics for professional drivers.

BRAND VOICE REQUIREMENTS:
- Direct, no-BS, confident tone (Larry Winget inspired)
- NEVER say "trucker" - use "driver" or "professional driver"
- NEVER say "truckers" - use "drivers", "O/Os", "owner-operators", or "The Tribe"
- Use phrases like "proper human diet", "owner-operator of your health", "diesel in your blood"
- Challenge conventional medical establishment
- No wishy-washy qualifiers

KEY TOPICS:
- Gut health (70% of drivers have Candida overgrowth)
- Sleep optimization (drivers average 4.78 hours/night)
- Proper human diet (Paleo-based nutrition)
- Detoxification (diesel exhaust exposure)
- Mental performance and focus
`,

  business: `
CONTENT FOCUS: TRUCKING BUSINESS & OPERATIONS
This campaign is about BUSINESS topics for owner-operators.

BRAND VOICE REQUIREMENTS:
- Direct, numbers-focused, no-BS business advice
- NEVER say "trucker" - use "driver", "O/O", or "owner-operator"
- Use phrases like "know your numbers", "run your trucking business like a business"
- Focus on profitability, efficiency, and smart business decisions
- Challenge industry norms that hurt owner-operators

KEY TOPICS:
- Fuel efficiency and MPG optimization
- Cost per mile calculations
- Rate negotiation and revenue management
- Equipment maintenance and lifecycle costs
- Business operations and cash flow
- Tax strategy for owner-operators
`,

  industry: `
CONTENT FOCUS: INDUSTRY NEWS & REGULATIONS
This campaign is about INDUSTRY topics.

BRAND VOICE REQUIREMENTS:
- Informed, authoritative, driver-advocate perspective
- NEVER say "trucker" - use "driver" or "professional driver"
- Challenge regulations that hurt independent drivers
- Provide actionable compliance information

KEY TOPICS:
- FMCSA regulations and compliance
- ELD, HOS, and DOT requirements
- Market trends and freight outlook
- Industry changes affecting owner-operators
`,

  lifestyle: `
CONTENT FOCUS: DRIVER LIFESTYLE & COMMUNITY
This campaign is about LIFESTYLE topics.

BRAND VOICE REQUIREMENTS:
- Relatable, community-focused, supportive
- NEVER say "trucker" - use "driver" or "professional driver"
- Use phrases like "The Tribe", "diesel in your blood"
- Celebrate the driver lifestyle while acknowledging challenges

KEY TOPICS:
- Life on the road
- Work-life balance and home time
- Driver community and support
- The unique driver lifestyle
`,

  fiction: `
CONTENT FOCUS: TRUCKTALES FICTION
This campaign is about TRUCKTALES stories.

BRAND VOICE REQUIREMENTS:
- Storyteller voice - engaging, suspenseful, narrative-driven
- Build anticipation and curiosity
- NO health or business content in TruckTales campaigns
- Focus on characters, plot, and emotional hooks

KEY TOPICS:
- Story teasers and cliffhangers
- Character introductions
- Behind-the-scenes of story creation
- Reader engagement
`,

  general: `
CONTENT FOCUS: GENERAL (adapt to topic)
Adapt voice and content to the specific topic provided.

BRAND VOICE REQUIREMENTS:
- Direct, confident, authentic
- NEVER say "trucker" - use "driver" or "professional driver"
- Match the tone to the subject matter
`,
};

const SOURCE_TYPE_GUIDELINES: Record<string, string> = {
  guide: `
    GUIDE CAMPAIGN STRUCTURE (14 days recommended):
    - Days 1-3: AWARENESS PHASE - Problem agitation, shocking stats from the guide
    - Days 4-10: VALUE PHASE - Tips, insights, education from guide content
    - Days 11-14: CONVERSION PHASE - Direct CTA to landing page, urgency

    Always include landing page with email capture.
    Connect to recommended product in final phase.
    Extract specific statistics and quotes from the guide.
  `,
  product: `
    PRODUCT CAMPAIGN STRUCTURE (7 days recommended):

    LAUNCH STYLE (for new products, limited editions):
    - Days 1-2: Teaser/countdown, build anticipation
    - Day 3: Reveal, full product showcase
    - Days 4-7: Benefits deep dive, urgency, social proof

    EDUCATION STYLE (for complex/premium products):
    - Days 1-2: Problem awareness, pain points
    - Days 3-4: Education on the solution category
    - Days 5-7: Product as the answer, specific benefits, CTA

    PROBLEM/SOLUTION STYLE (for pain-point products):
    - Days 1-3: Agitate the problem, share struggles
    - Days 4-5: Introduce the solution concept
    - Days 6-7: Hard sell with testimonials and urgency
  `,
  episode: `
    EPISODE CAMPAIGN STRUCTURE (5 days recommended):
    - Day 1: Main hook/headline - the most compelling quote or stat
    - Day 2: Supporting content - another angle or quote
    - Day 3: Hot take - controversial or bold statement
    - Day 4: Story highlight - caller segment or anecdote
    - Day 5: CTA - drive to full episode, product, or signup

    Focus on the extracted content the user selected.
  `,
  quick_idea: `
    IDEA CAMPAIGN STRUCTURE (7 days recommended):
    AI should determine the best structure based on the topic:

    ANGLE VARIATION (for broad topics):
    - Same core message presented from different angles each day
    - Day 1: The problem, Day 2: The stats, Day 3: The solution, etc.

    PROGRESSIVE EDUCATION (for complex topics):
    - Day 1: Problem statement
    - Day 2: Why it happens
    - Day 3-4: The solution explained
    - Day 5-6: Action steps
    - Day 7: CTA and resources
  `,
  success_story: `
    SUCCESS STORY CAMPAIGN - STORY ARC (5 days recommended):
    - Day 1: THE STARTING POINT - Where they were, the struggles, the "before"
    - Day 2: THE BREAKING POINT - What made them finally decide to change
    - Day 3: THE JOURNEY - What they did, the protocol, the challenges
    - Day 4: THE RESULTS - The transformation, the numbers, the "after"
    - Day 5: THE INVITATION - Your turn, how to start, CTA

    Each day builds narrative tension. Use specific metrics when available.
    Keep client anonymous unless explicitly approved.
  `,
  trucktales: `
    TRUCKTALES CAMPAIGN (7 days recommended):
    - Day 1: Story premise teaser - hook without spoilers
    - Day 2: Character introduction - who is this story about
    - Day 3: Excerpt/cliffhanger - compelling scene excerpt
    - Day 4: Behind-the-scenes - writing process, inspiration
    - Day 5: Another teaser - different angle
    - Day 6: Reader/listener hook - why this story matters
    - Day 7: Release CTA - where to read/listen

    Use TruckTales Storyteller voice - fiction-focused, no health content.
    Build suspense and curiosity throughout.
  `,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceType,
      sourceData,
      sourceContent,
      sourceTitle,
      contentCategory: explicitCategory,
      campaignConfig,
      interviewAnswers,
    } = body;

    const guidelines = SOURCE_TYPE_GUIDELINES[sourceType] || SOURCE_TYPE_GUIDELINES.quick_idea;

    // Use explicit category if provided (user selected it), otherwise detect from content
    const detectedCategory = detectContentCategory(
      sourceData || {},
      interviewAnswers || {},
      sourceContent,
      sourceTitle
    );

    // Prefer explicit category from the UI, but fall back to detected
    // Type-safe category selection
    const validCategories: ContentCategory[] = ["health", "business", "industry", "lifestyle", "fiction", "general"];
    const isValidCategory = (cat: unknown): cat is ContentCategory =>
      typeof cat === "string" && validCategories.includes(cat as ContentCategory);

    const contentCategory: ContentCategory = isValidCategory(explicitCategory) && explicitCategory !== 'general'
      ? explicitCategory
      : detectedCategory;

    console.log(`[WizardStrategy] Using category: ${contentCategory} (explicit: ${explicitCategory}, detected: ${detectedCategory})`);
    console.log(`[WizardStrategy] sourceContent: "${(sourceContent || '').substring(0, 100)}..."`);

    const categoryVoice = CATEGORY_VOICE[contentCategory];

    const prompt = `You are Content Refinery's campaign strategist for Let's Truck.

CRITICAL: Generate a campaign about the SPECIFIC TOPIC provided below. Do NOT default to health content unless the topic is explicitly about health.

Generate a multi-day social media campaign strategy.

USER'S TOPIC/IDEA (THIS IS WHAT THE CAMPAIGN SHOULD BE ABOUT):
"${sourceContent || sourceTitle || sourceData?.content || sourceData?.title || 'Not specified'}"

SOURCE TYPE: ${sourceType}
SOURCE DATA: ${JSON.stringify(sourceData, null, 2)}

CONTENT CATEGORY: ${contentCategory.toUpperCase()}
${categoryVoice}

CAMPAIGN CONFIGURATION:
- Duration: ${campaignConfig.duration} days
- Style: ${campaignConfig.style || 'AI recommended'}
- Platforms: ${campaignConfig.platforms.join(', ')}
- Posting Frequency: ${JSON.stringify(campaignConfig.frequency)}
- CTA Type: ${campaignConfig.ctaType}
- CTA URL: ${campaignConfig.ctaUrl || 'TBD'}
- Include Email Sequence: ${campaignConfig.includeEmail}

USER INTERVIEW ANSWERS:
${JSON.stringify(interviewAnswers, null, 2)}

SOURCE-SPECIFIC GUIDELINES:
${guidelines}

IMPORTANT: The campaign name, key messages, phases, themes, and hooks MUST ALL relate to the user's topic: "${sourceContent || sourceTitle || sourceData?.content || sourceData?.title || 'provided'}".
Do NOT create generic health content. Create content SPECIFICALLY about the topic the user provided.
Do NOT create generic health content unless the user specifically asked for health content.

Generate a campaign strategy in this exact JSON format:
{
  "campaignName": "string - compelling campaign name",
  "phases": [
    {
      "name": "string - phase name",
      "dayRange": [startDay, endDay],
      "purpose": "string - what this phase accomplishes",
      "themes": ["string - content themes for this phase"],
      "hooks": ["string - specific hooks/angles to use"],
      "postsPerDay": { "twitter": 2, "facebook": 1, "instagram": 1 }
    }
  ],
  "keyMessages": ["string - core messages to reinforce throughout"],
  "landingPageCopy": {
    "headline": "string - main headline",
    "subhead": "string - supporting subhead",
    "cta": "string - button text",
    "bullets": ["string - key benefit bullets"]
  },
  "emailSubjects": ["string - subject lines for each email if includeEmail is true"]
}

Respond ONLY with valid JSON, no markdown or explanation.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Clean the response - remove markdown code blocks if present
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const strategy = JSON.parse(jsonText);

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error('Strategy generation error:', error);
    return NextResponse.json({ error: 'Failed to generate strategy' }, { status: 500 });
  }
}
