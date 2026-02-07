import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractJsonFromText } from '@/lib/utils/api';

const anthropic = new Anthropic();

// Show-specific context for the AI prompt
const SHOW_CONTEXT: Record<string, string> = {
  tbb: `SHOW: Trucking Business & Beyond (TBB)
This is Kevin's flagship show covering BOTH trucking business AND health topics.
- Mix of owner-operator business advice, industry news, and health/nutrition
- Audience: Professional drivers, owner-operators, small fleet owners
- Tone: Business-savvy but accessible, switches between business hard talk and health education
- Common segments: Industry news, business numbers, health deep dives, caller questions
- Kevin often connects business performance to health (e.g., "You can't run a profitable operation if you're falling asleep at the wheel")`,

  destination_health: `SHOW: Destination Health
This is Kevin's pure health and nutrition show.
- 100% focused on functional health, nutrition, supplements, and wellness
- Audience: Professional drivers concerned about their health, plus general health-conscious listeners
- Tone: Science-backed but anti-establishment, challenges conventional medicine
- Common segments: Research deep dives, supplement protocols, listener health questions, success stories
- Kevin speaks as an FNTP (Functional Nutritional Therapy Practitioner)
- Heavy focus on: gut health, cardiovascular health, blood sugar, sleep, hormones, detox`,

  power_hour: `SHOW: Power Hour
This is Kevin's interactive caller Q&A show.
- Caller-driven format with live questions and answers
- Audience: Active members of The Tribe, returning listeners with specific health or business questions
- Tone: Conversational, coaching-style, direct advice
- Format: Take caller, listen to question, provide detailed answer, connect to resources/products
- Kevin often builds on previous episodes and references past advice
- Great for addressing common misconceptions and providing personalized guidance`,

  coffee_with_kevin: `SHOW: Coffee with Kevin
This is Kevin's eclectic morning show airing Tuesday and Thursday mornings.
- ANY topic goes — health, business, politics, current events, personal stories, listener topics
- Audience: The Tribe tuning in during their morning coffee/pre-trip routine
- Tone: Relaxed, conversational, morning coffee chat energy — but still Kevin's signature no-BS directness
- Format: Free-flowing topics, morning motivation, whatever Kevin is fired up about that day
- Often includes: hot takes on news, personal anecdotes, listener shoutouts, industry rants
- Kevin speaks freely here — less structured than other shows, more personality-driven`,

  custom: `SHOW: Custom Show
This is a custom or special episode. Adapt the tone and structure based on the source content provided.`,
};

const BRAND_TERMINOLOGY = `
CRITICAL TERMINOLOGY RULES (NEVER VIOLATE):
- NEVER say "trucker" or "truckers" - ALWAYS use "driver", "professional driver", "O/O", "owner-operator", or "The Tribe"
- NEVER say "truck driver" - use "professional driver"
- NEVER say "big rig" or "18-wheeler" - use "truck", "rig", or "equipment"
- Use "proper human diet" instead of generic diet terms
- Use "The Tribe" when referring to the Let's Truck community
- Use "real fuel" when talking about whole foods
`;

const KEVIN_VOICE_SUMMARY = `
KEVIN RUTHERFORD'S VOICE:
- Direct, no-BS, Larry Winget inspired
- Deeply knowledgeable but accessible
- Confrontational when challenging conventional wisdom
- Uses trucking industry vernacular naturally
- Anti-establishment (especially conventional medicine and big pharma)
- Pro-driver, pro-owner-operator, anti-corporate-trucking
- Uses humor and occasional strong language for emphasis
- Key phrases: "diesel in your blood", "nobody's coming to save you", "owner-operator of your health"
- NEVER wishy-washy: no "maybe", "possibly", "it might help"
- NEVER corporate speak or generic health advice
`;

interface ShowNotesSourceItem {
  id: string;
  type: string;
  title: string;
  content: string;
  url?: string;
  sourceName?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { show, customShowName, sourceItems } = body as {
      show: string;
      customShowName?: string;
      sourceItems: ShowNotesSourceItem[];
    };

    if (!show || !sourceItems || sourceItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: show and sourceItems (non-empty)' },
        { status: 400 }
      );
    }

    const showContext = SHOW_CONTEXT[show] || SHOW_CONTEXT.custom;
    const showDisplayName = show === 'custom' && customShowName
      ? customShowName
      : show === 'tbb' ? 'Trucking Business & Beyond'
      : show === 'destination_health' ? 'Destination Health'
      : show === 'power_hour' ? 'Power Hour'
      : show === 'coffee_with_kevin' ? 'Coffee with Kevin'
      : 'Custom Show';

    // Build source items listing for the prompt
    const sourceItemsText = sourceItems.map((item, index) => {
      return `--- SOURCE ITEM ${index + 1} ---
ID: ${item.id}
Type: ${item.type}
Title: ${item.title}
${item.url ? `URL: ${item.url}` : ''}
${item.sourceName ? `Source: ${item.sourceName}` : ''}
Content:
${item.content}
--- END SOURCE ITEM ${index + 1} ---`;
    }).join('\n\n');

    const prompt = `You are Kevin Rutherford's show prep assistant. Generate comprehensive show notes for an upcoming episode of "${showDisplayName}".

${KEVIN_VOICE_SUMMARY}

${showContext}

${BRAND_TERMINOLOGY}

SOURCE MATERIALS (${sourceItems.length} items):
${sourceItemsText}

YOUR TASK:
Analyze ALL source materials and create structured show notes with three outputs:

1. **OUTLINE** - A structured segment-by-segment show outline:
   - Find connections and themes across the source items
   - Suggest an optimal segment order that flows naturally
   - For each segment, provide:
     - A compelling segment title
     - Detailed talking points (bullets Kevin can glance at while on air)
     - A suggested transition to the next segment
     - Which source items it draws from (by ID)
     - Any statistics worth mentioning
     - Estimated duration in minutes
     - Segment type: opening, topic, deep_dive, caller_segment, product_mention, or closing
   - Include an opening segment and closing segment
   - Connection map showing how source items relate to each other

2. **PUBLIC NOTES** - Listener-facing show notes for the episode page:
   - Episode title (compelling, not generic)
   - Episode description (2-3 sentences that hook the listener)
   - Topics list (what the episode covers)
   - Key takeaways (what listeners will learn)
   - Product mentions (any products referenced)
   - Relevant links from the source materials

3. **TEASER TEXT** - A social media teaser (1-3 sentences) to promote the episode before it airs. Should create curiosity and urgency. Use Kevin's voice.

Respond ONLY with valid JSON in this exact format:
{
  "outline": {
    "segments": [
      {
        "id": "seg-1",
        "order": 0,
        "title": "Segment title",
        "talkingPoints": ["Point 1", "Point 2", "Point 3"],
        "suggestedTransition": "Transition text to next segment",
        "sourceItemIds": ["source-item-id-1"],
        "statsToMention": ["Relevant stat 1"],
        "estimatedMinutes": 10,
        "type": "opening"
      }
    ],
    "connectionMap": [
      {
        "fromSourceId": "source-id-1",
        "toSourceId": "source-id-2",
        "connectionType": "theme",
        "description": "How these connect"
      }
    ],
    "estimatedDuration": "45 minutes"
  },
  "publicNotes": {
    "title": "Episode title",
    "description": "Episode description",
    "topicsList": ["Topic 1", "Topic 2"],
    "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
    "productMentions": ["Product 1"],
    "links": [
      { "label": "Link label", "url": "https://..." }
    ]
  },
  "teaserText": "Social media teaser text"
}

Respond ONLY with valid JSON.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Use the robust JSON extraction utility
    const { data, error } = extractJsonFromText<{
      outline: {
        segments: Array<{
          id: string;
          order: number;
          title: string;
          talkingPoints: string[];
          suggestedTransition: string;
          sourceItemIds: string[];
          statsToMention?: string[];
          estimatedMinutes?: number;
          type: string;
        }>;
        connectionMap: Array<{
          fromSourceId: string;
          toSourceId: string;
          connectionType: string;
          description: string;
        }>;
        estimatedDuration?: string;
      };
      publicNotes: {
        title: string;
        description: string;
        topicsList: string[];
        keyTakeaways: string[];
        productMentions: string[];
        links: Array<{ label: string; url: string }>;
      };
      teaserText: string;
    }>(content.text, 'object');

    if (error || !data) {
      console.error('[Show Notes Generate] Failed to parse AI response:', error);
      return NextResponse.json(
        { error: 'Failed to parse AI-generated show notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      outline: data.outline,
      publicNotes: data.publicNotes,
      teaserText: data.teaserText,
    });
  } catch (error) {
    console.error('[Show Notes Generate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate show notes' },
      { status: 500 }
    );
  }
}
