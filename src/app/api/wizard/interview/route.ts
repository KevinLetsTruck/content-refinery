import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const INTERVIEW_FOCUS: Record<string, string> = {
  guide: `
    Focus on:
    - What's the main pain point this guide addresses?
    - Who is the ideal reader? (new driver, veteran, specific issue)
    - What's the one thing you want them to do after downloading?
    - Any specific stat or hook from the guide to lead with?
    - What category is this guide? (health, business, industry, lifestyle)
  `,
  product: `
    Focus on:
    - What problem does this product solve for drivers?
    - Who needs it most? (symptoms, situations, driver types)
    - Any recent success stories with this product?
    - Is there urgency? (limited stock, seasonal, new launch)
    - What makes this different from alternatives?
    - Is this a health product, business tool, or equipment?
  `,
  episode: `
    Focus on:
    - What's the main topic of this episode? (health, business, industry news, lifestyle)
    - What's the most controversial or surprising thing from this episode?
    - Was there a memorable caller segment worth highlighting?
    - What action should listeners take after hearing this?
    - Any quotes that would make drivers stop scrolling?
  `,
  quick_idea: `
    Focus on:
    - What's the main category of this content? (health, business/trucking operations, industry news, lifestyle, fiction)
    - What prompted this idea? (recent conversation, news, client question)
    - Who most needs to hear this message?
    - What's the one action you want them to take?
    - Any personal story, client example, or stat that supports this?
  `,
  success_story: `
    Focus on:
    - What type of success story is this? (health transformation, business success, both)

    For HEALTH success stories:
    - What were the before metrics? (weight, A1C, sleep hours, energy level)
    - What protocol/supplements/lifestyle changes did they follow?
    - What are the after metrics?

    For BUSINESS success stories:
    - What were the before numbers? (CPM, revenue, profit margin, MPG)
    - What changes did they make? (operations, rates, fuel strategy)
    - What are the after numbers?

    For all stories:
    - What was the turning point - what made them finally change?
    - What does this person do? (O/O, company driver, team driver)
    - Can we use their first name or need an alias?
  `,
  trucktales: `
    Focus on:
    - What's unique about this story or character?
    - What themes does it explore? (isolation, family, life on the road)
    - Any unexpected twists to tease without spoiling?
    - Who's the target reader? (fiction fans, trucking community, or both)
    - What emotion should readers feel?
  `,
  business: `
    Focus on:
    - What specific business topic is this about? (fuel efficiency, rates, operations, equipment)
    - What problem or opportunity are you addressing?
    - Do you have specific numbers or results to share?
    - Who needs this information most? (new O/Os, veterans, company drivers considering O/O)
    - What action should they take after reading this?
  `,
  industry: `
    Focus on:
    - What regulation, news, or trend are you covering?
    - How does this specifically affect drivers? (compliance, costs, operations)
    - What action should drivers take?
    - What's your perspective on this change?
    - Any deadlines or timelines drivers need to know?
  `,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceType, sourceData, mode, previousAnswers } = body;

    const focus = INTERVIEW_FOCUS[sourceType] || INTERVIEW_FOCUS.quick_idea;

    const prompt = `You are an AI interviewer helping refine content for Let's Truck (trucking content spanning health, business, industry news, and lifestyle).

MODE: ${mode} (${mode === 'campaign' ? 'multi-day coordinated campaign' : 'single post or set of platform variations'})
SOURCE TYPE: ${sourceType}
SOURCE DATA: ${JSON.stringify(sourceData, null, 2)}

PREVIOUS ANSWERS: ${JSON.stringify(previousAnswers, null, 2)}

INTERVIEW FOCUS:
${focus}

Your job is to ask 1-3 focused questions to gather the information needed to create compelling content.

Rules:
- Keep questions conversational and specific
- Don't repeat questions already answered in PREVIOUS ANSWERS
- If you have enough information to create great content, set isComplete to true
- For campaigns, you need more detail than for quick posts
- Questions should help identify hooks, angles, and specific details

Respond in this exact JSON format:
{
  "questions": [
    {
      "id": "q1",
      "question": "Your question here?",
      "type": "text",
      "placeholder": "Optional placeholder text"
    }
  ],
  "isComplete": false,
  "readyMessage": "Only include if isComplete is true - brief message about what you'll create"
}

For question types:
- "text" for open-ended questions
- "select" for single choice (include "options": ["Option 1", "Option 2"])
- "multiselect" for multiple choice (include "options": [...])

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
    console.error('Interview API error:', error);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}
