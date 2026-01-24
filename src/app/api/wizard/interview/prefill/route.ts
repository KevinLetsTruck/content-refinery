import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

type ContentCategory = 'health' | 'trucking' | 'finance' | 'business' | 'politics' | 'general';

const SOURCE_CONTEXT: Record<string, string> = {
  guide: `This is a lead magnet health guide. Focus on the main health problem it solves, who struggles with this issue, and what transformation they can expect.`,
  product: `This is a health product/supplement. Focus on the specific problem it solves for drivers, key benefits, and why it's different from alternatives.`,
  episode: `This is a podcast episode. Focus on the most compelling talking points, controversial takes, or actionable advice from the episode.`,
  quick_idea: `This is a quick content idea. Turn it into a compelling message that will resonate with professional truck drivers.`,
  success_story: `This is a client success story. Focus on the transformation - before/after metrics, what changed, and making it relatable.`,
  trucktales: `This is a TruckTales fiction story. Focus on themes that resonate with drivers, teasing the story without spoilers.`,
  feedly: `This is an article from Feedly. Focus on the key points and insights relevant to the content category.`,
};

// Category-specific context and rules
const CATEGORY_CONFIG: Record<ContentCategory, {
  focus: string;
  audience: string;
  voiceNotes: string;
  restrictions: string;
}> = {
  health: {
    focus: 'health, nutrition, supplements, longevity, and wellness for professional drivers',
    audience: 'Drivers interested in improving their health and performance',
    voiceNotes: `- Challenge conventional medical establishment
- Key phrases: "proper human diet", "owner-operator of your health"
- Focus on functional nutrition and root cause solutions`,
    restrictions: '',
  },
  trucking: {
    focus: 'trucking industry news, regulations, equipment, business operations, and driver lifestyle',
    audience: 'Professional drivers and owner-operators focused on their business and industry',
    voiceNotes: `- Speak as a trucking industry insider
- Focus on: regulations, equipment, business, rates, load boards, DOT compliance
- STRICTLY FORBIDDEN: Do NOT pivot to health topics, do NOT use health metaphors
- STRICTLY FORBIDDEN: Do NOT compare trucks to bodies or inspections to health checkups
- This is PURELY about the trucking industry - keep it 100% on trucking topics`,
    restrictions: `CRITICAL RESTRICTIONS FOR TRUCKING CATEGORY:
- ABSOLUTELY NO health content, health metaphors, or health tie-ins
- Do NOT mention "your body", "your health", "operating your body", or any health comparisons
- Do NOT pivot a trucking topic to health - keep it PURELY about trucking
- If the source is about truck inspections, talk about truck inspections - NOT body inspections
- If the source is about equipment maintenance, talk about equipment - NOT body maintenance`,
  },
  finance: {
    focus: 'personal finance, taxes, retirement planning, and wealth building for drivers',
    audience: 'Drivers looking to improve their financial situation',
    voiceNotes: `- Focus on practical financial advice for self-employed drivers
- Topics: taxes, 401k/retirement, expense tracking, per diem, fuel savings
- STRICTLY FORBIDDEN: Do NOT pivot to health topics`,
    restrictions: `CRITICAL RESTRICTIONS FOR FINANCE CATEGORY:
- ABSOLUTELY NO health content, health metaphors, or health tie-ins
- Keep content 100% focused on financial topics
- Do NOT compare financial health to physical health`,
  },
  business: {
    focus: 'small business operations, entrepreneurship, and owner-operator business strategies',
    audience: 'Owner-operators and small fleet owners running their businesses',
    voiceNotes: `- Focus on business operations, growth, efficiency
- Topics: authority, insurance, accounting, hiring, scaling
- STRICTLY FORBIDDEN: Do NOT pivot to health topics`,
    restrictions: `CRITICAL RESTRICTIONS FOR BUSINESS CATEGORY:
- ABSOLUTELY NO health content, health metaphors, or health tie-ins
- Keep content 100% focused on business topics
- Do NOT compare business health to physical health`,
  },
  politics: {
    focus: 'trucking industry politics, regulations, legislation, and advocacy',
    audience: 'Drivers interested in industry politics and regulations',
    voiceNotes: `- Focus on political issues affecting trucking
- Topics: FMCSA rules, state regulations, industry lobbying, driver rights
- STRICTLY FORBIDDEN: Do NOT pivot to health topics`,
    restrictions: `CRITICAL RESTRICTIONS FOR POLITICS CATEGORY:
- ABSOLUTELY NO health content, health metaphors, or health tie-ins
- Keep content 100% focused on political/regulatory topics
- Stick to industry politics, don't add health angles`,
  },
  general: {
    focus: 'general interest content for the trucking community',
    audience: 'All professional drivers',
    voiceNotes: `- Keep it relevant to trucking community
- Can be broader in scope but stay relevant to drivers`,
    restrictions: '',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceType, sourceContent, sourceTitle, mode, contentCategory = 'health' } = body;

    const context = SOURCE_CONTEXT[sourceType] || SOURCE_CONTEXT.quick_idea;
    const categoryConfig = CATEGORY_CONFIG[contentCategory as ContentCategory] || CATEGORY_CONFIG.health;

    const prompt = `You are generating a content brief for Let's Truck social media content.

SOURCE TYPE: ${sourceType}
SOURCE TITLE: ${sourceTitle || 'Not provided'}
SOURCE CONTENT: ${sourceContent}
MODE: ${mode} (${mode === 'campaign' ? 'multi-day coordinated campaign' : 'single post'})

CONTENT CATEGORY: ${contentCategory.toUpperCase()}
CATEGORY FOCUS: ${categoryConfig.focus}
TARGET AUDIENCE: ${categoryConfig.audience}

CONTEXT: ${context}

BRAND VOICE RULES:
- NEVER say "trucker" - always use "driver" or "professional driver"
- NEVER say "truckers" - use "drivers", "O/Os", "owner-operators", or "The Tribe"
- Direct, no-BS, confident tone (Larry Winget inspired)
${categoryConfig.voiceNotes}

${categoryConfig.restrictions}

Generate a content brief with these 6 fields. Be specific and actionable.
The primaryMessage and supportingEvidence MUST be 100% focused on ${categoryConfig.focus}.
${contentCategory !== 'health' ? `
CRITICAL: The user selected "${contentCategory.toUpperCase()}" as the category.
You MUST NOT include ANY health content, health metaphors, or health pivots.
Stay 100% on topic for ${contentCategory}.
` : ''}

Respond in this exact JSON format:
{
  "primaryMessage": "The core message in 1-2 compelling sentences. Make it specific to this source content and the ${contentCategory} category.",
  "targetAudience": "new_drivers" | "experienced_oo" | "health_curious" | "skeptics" | "all",
  "targetEmotion": "wake_up_call" | "empowerment" | "curiosity" | "frustration" | "hope",
  "supportingEvidence": "A specific stat, story, or fact that supports the message. Pull from the source content if possible. Must be relevant to ${contentCategory}.",
  "callToAction": "visit_store" | "book_coaching" | "download_guide" | "join_community" | "awareness",
  "tone": "direct" | "educational" | "inspirational" | "urgent" | "conversational"
}

TARGET AUDIENCE OPTIONS:
- "new_drivers": Drivers new to ${contentCategory === 'health' ? 'health optimization' : 'this topic'}
- "experienced_oo": Experienced owner-operators who know the industry
- "health_curious": Drivers interested in learning more
- "skeptics": Drivers who are skeptical about this topic
- "all": Broadly applicable to all drivers

TARGET EMOTION OPTIONS:
- "wake_up_call": Shock them into action with hard truths
- "empowerment": Make them feel capable of taking action
- "curiosity": Pique interest to learn more
- "frustration": Tap into frustration with the current situation
- "hope": Show possibility of positive change

CALL TO ACTION OPTIONS:
- "visit_store": Buy a product from store.letstruck.com
- "book_coaching": Book a health coaching session
- "download_guide": Download a free guide
- "join_community": Join The Tribe/community
- "awareness": Just spreading awareness, no hard CTA

TONE OPTIONS:
- "direct": No-BS, confrontational truth bombs
- "educational": Teaching mode, explaining concepts
- "inspirational": Uplifting, transformation-focused
- "urgent": Time-sensitive, act now messaging
- "conversational": Casual, like talking to a friend

Respond ONLY with valid JSON.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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

    const response = JSON.parse(jsonText);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Interview prefill API error:', error);
    return NextResponse.json({ error: 'Failed to generate content brief' }, { status: 500 });
  }
}
