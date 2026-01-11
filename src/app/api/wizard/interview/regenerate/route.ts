import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const FIELD_PROMPTS: Record<string, string> = {
  primaryMessage: `Generate a NEW primary message - the core message in 1-2 compelling sentences. Make it different from the current one but equally impactful.`,
  targetAudience: `Choose the BEST target audience for this content. Consider who would benefit most from hearing this message.`,
  targetEmotion: `Choose the MOST effective emotion to evoke. Consider what will drive the desired action.`,
  supportingEvidence: `Generate NEW supporting evidence - a specific stat, story, or fact that backs up the message. Be specific and compelling.`,
  callToAction: `Choose the BEST call to action for this content. Consider what natural next step makes sense.`,
  tone: `Choose the BEST tone for delivering this message. Consider what will resonate most with the target audience.`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { field, sourceType, sourceContent, sourceTitle, currentValues } = body;

    if (!field || !FIELD_PROMPTS[field]) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    const fieldPrompt = FIELD_PROMPTS[field];

    const prompt = `You are regenerating a single field for a Let's Truck Health Coaching content brief.

SOURCE TYPE: ${sourceType}
SOURCE TITLE: ${sourceTitle || 'Not provided'}
SOURCE CONTENT: ${sourceContent}

CURRENT CONTENT BRIEF:
- Primary Message: ${currentValues.primaryMessage}
- Target Audience: ${currentValues.targetAudience}
- Target Emotion: ${currentValues.targetEmotion}
- Supporting Evidence: ${currentValues.supportingEvidence}
- Call to Action: ${currentValues.callToAction}
- Tone: ${currentValues.tone}

FIELD TO REGENERATE: ${field}
INSTRUCTION: ${fieldPrompt}

BRAND VOICE RULES:
- NEVER say "trucker" - always use "driver" or "professional driver"
- Direct, no-BS, confident tone

${field === 'primaryMessage' || field === 'supportingEvidence' ? `
Generate a text value that is DIFFERENT from the current value.` : `
Choose from these options:
${field === 'targetAudience' ? '- new_drivers, experienced_oo, health_curious, skeptics, all' : ''}
${field === 'targetEmotion' ? '- wake_up_call, empowerment, curiosity, frustration, hope' : ''}
${field === 'callToAction' ? '- visit_store, book_coaching, download_guide, join_community, awareness' : ''}
${field === 'tone' ? '- direct, educational, inspirational, urgent, conversational' : ''}
`}

Respond in this exact JSON format:
{
  "${field}": "your new value here"
}

Respond ONLY with valid JSON.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
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

    const response = JSON.parse(jsonText);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Interview regenerate API error:', error);
    return NextResponse.json({ error: 'Failed to regenerate field' }, { status: 500 });
  }
}
