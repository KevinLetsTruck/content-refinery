import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface ContentOption {
  id: string;
  text: string;
  type: string;
  emotion: string;
  cta: string;
  hashtags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceType, sourceContent, interviewData, count = 3 } = body;

    const prompt = `Generate ${count} different social media post options for Let's Truck Health Coaching.

SOURCE TYPE: ${sourceType}
SOURCE CONTENT: ${sourceContent}

INTERVIEW DATA:
- Primary Message: ${interviewData?.primaryMessage || 'Not specified'}
- Target Emotion: ${interviewData?.targetEmotion || 'Not specified'}
- Supporting Evidence: ${interviewData?.supportingEvidence || 'Not specified'}
- Call to Action: ${interviewData?.callToAction || 'Not specified'}
- Target Audience: ${interviewData?.targetAudience || 'Professional truck drivers'}
- Tone: ${interviewData?.tone || 'Direct and confident'}

BRAND VOICE:
- Direct, no-BS, confident (Larry Winget inspired)
- NEVER say "trucker" - use "driver" or "professional driver"
- NEVER say "truckers" - use "drivers", "O/Os", "owner-operators", "The Tribe"
- Phrases: "proper human diet", "owner-operator of your health", "diesel in your blood"
- Challenge conventional medical establishment
- No wishy-washy qualifiers ("maybe", "might", "could possibly")

CONTENT TYPES TO CHOOSE FROM:
- stat: Lead with a shocking statistic
- quote: A powerful, quotable statement
- hook: Attention-grabbing opening that creates curiosity
- tip: Actionable advice they can use immediately
- testimonial: Results-focused transformation story
- educational: Teaching a concept or explaining something

Generate ${count} DIFFERENT content variations. Each should:
1. Be suitable for social media (flexible length, adapt to platform later)
2. Match the brand voice exactly
3. Include relevant hashtags
4. Have a clear emotional appeal

Respond in this exact JSON format:
{
  "options": [
    {
      "id": "1",
      "text": "The full post text",
      "type": "stat",
      "emotion": "The primary emotion this content evokes",
      "cta": "The implied call to action",
      "hashtags": ["relevant", "hashtags", "without", "the", "hash"]
    }
  ]
}

Respond ONLY with valid JSON.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Clean the response
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

    const data = JSON.parse(jsonText);

    // Ensure each option has a unique ID
    const options: ContentOption[] = data.options.map((opt: ContentOption, index: number) => ({
      ...opt,
      id: `option-${Date.now()}-${index}`,
    }));

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content options' },
      { status: 500 }
    );
  }
}
