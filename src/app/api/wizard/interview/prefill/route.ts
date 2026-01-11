import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SOURCE_CONTEXT: Record<string, string> = {
  guide: `This is a lead magnet health guide. Focus on the main health problem it solves, who struggles with this issue, and what transformation they can expect.`,
  product: `This is a health product/supplement. Focus on the specific problem it solves for drivers, key benefits, and why it's different from alternatives.`,
  episode: `This is a podcast episode. Focus on the most compelling talking points, controversial takes, or actionable advice from the episode.`,
  quick_idea: `This is a quick content idea. Turn it into a compelling message that will resonate with professional truck drivers.`,
  success_story: `This is a client success story. Focus on the transformation - before/after metrics, what changed, and making it relatable.`,
  trucktales: `This is a TruckTales fiction story. Focus on themes that resonate with drivers, teasing the story without spoilers.`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceType, sourceContent, sourceTitle, mode } = body;

    const context = SOURCE_CONTEXT[sourceType] || SOURCE_CONTEXT.quick_idea;

    const prompt = `You are generating a content brief for Let's Truck Health Coaching social media content.

SOURCE TYPE: ${sourceType}
SOURCE TITLE: ${sourceTitle || 'Not provided'}
SOURCE CONTENT: ${sourceContent}
MODE: ${mode} (${mode === 'campaign' ? 'multi-day coordinated campaign' : 'single post'})

CONTEXT: ${context}

BRAND VOICE RULES:
- NEVER say "trucker" - always use "driver" or "professional driver"
- NEVER say "truckers" - use "drivers", "O/Os", "owner-operators", or "The Tribe"
- Direct, no-BS, confident tone (Larry Winget inspired)
- Challenge conventional medical establishment
- Key phrases: "proper human diet", "owner-operator of your health", "diesel in your blood"

Generate a content brief with these 6 fields. Be specific and actionable.

Respond in this exact JSON format:
{
  "primaryMessage": "The core message in 1-2 compelling sentences. Make it specific to this source content.",
  "targetAudience": "new_drivers" | "experienced_oo" | "health_curious" | "skeptics" | "all",
  "targetEmotion": "wake_up_call" | "empowerment" | "curiosity" | "frustration" | "hope",
  "supportingEvidence": "A specific stat, story, or fact that supports the message. Pull from the source content if possible.",
  "callToAction": "visit_store" | "book_coaching" | "download_guide" | "join_community" | "awareness",
  "tone": "direct" | "educational" | "inspirational" | "urgent" | "conversational"
}

TARGET AUDIENCE OPTIONS:
- "new_drivers": Drivers new to health optimization
- "experienced_oo": Experienced owner-operators who've tried things before
- "health_curious": Drivers starting to think about their health
- "skeptics": Drivers who don't believe health changes work for them
- "all": Broadly applicable to all drivers

TARGET EMOTION OPTIONS:
- "wake_up_call": Shock them into action with hard truths
- "empowerment": Make them feel capable of change
- "curiosity": Pique interest to learn more
- "frustration": Tap into frustration with current health
- "hope": Show possibility of transformation

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
