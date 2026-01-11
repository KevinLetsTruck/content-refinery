import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

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
      campaignConfig,
      interviewAnswers,
    } = body;

    const guidelines = SOURCE_TYPE_GUIDELINES[sourceType] || SOURCE_TYPE_GUIDELINES.quick_idea;

    const prompt = `You are Content Refinery's campaign strategist for Let's Truck Health Coaching.

Generate a multi-day social media campaign strategy.

SOURCE TYPE: ${sourceType}
SOURCE DATA: ${JSON.stringify(sourceData, null, 2)}

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

BRAND VOICE REQUIREMENTS:
- Direct, no-BS, confident tone (Larry Winget inspired)
- NEVER say "trucker" - use "driver" or "professional driver"
- NEVER say "truckers" - use "drivers", "O/Os", "owner-operators", or "The Tribe"
- Use phrases like "proper human diet", "owner-operator of your health", "diesel in your blood"
- Challenge conventional medical establishment when relevant
- No wishy-washy qualifiers

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
