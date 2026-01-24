import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { findProductInText, type Product } from '@/lib/products/catalog';

const anthropic = new Anthropic();

// Map CTA types to actual URLs
// Note: download_guide intentionally has no URL - in quick post mode there's no landing page.
// For campaigns with actual landing pages, the URL is passed separately.
const CTA_URLS: Record<string, { url: string; label: string }> = {
  visit_store: {
    url: 'https://store.letstruck.com',
    label: 'Shop at store.letstruck.com'
  },
  book_coaching: {
    url: 'https://letstruck.com/coaching',
    label: 'Book coaching at letstruck.com/coaching'
  },
  download_guide: {
    url: '',
    label: 'Get the free guide'
  },
  join_community: {
    url: 'https://letstruck.com/tribe',
    label: 'Join at letstruck.com/tribe'
  },
  awareness: {
    url: '',
    label: ''
  }
};

interface ContentOption {
  id: string;
  text: string;
  type: string;
  emotion: string;
  cta: string;
  hashtags: string[];
}

/**
 * Build product context section for the prompt if a product is detected
 */
function buildProductContext(sourceContent: string, sourceType: string): string {
  // Try to find product in source content
  const product = findProductInText(sourceContent);

  if (!product) {
    return '';
  }

  // Map form to dosage language
  const formDescriptions: Record<string, string> = {
    capsule: "capsules/pills",
    liquid: "liquid - measure by tablespoon or teaspoon",
    powder: "powder - measure by scoop",
    drops: "liquid drops",
    honey: "honey - measure by teaspoon",
    gummies: "gummies",
    softgel: "softgels",
    stick: "stick packs",
    food: "food item",
    device: "device/equipment",
  };

  const formInfo = product.form ? `
- Product Form: ${formDescriptions[product.form] || product.form}
- Serving Size: ${product.servingSize || 'see label'}` : '';

  return `
PRODUCT DETAILS (USE THESE FACTS - DO NOT INVENT):
- Product Name: ${product.name}
- Price: $${product.price}
- Category: ${product.category}${product.subcategory ? ` (${product.subcategory})` : ''}${formInfo}
- Description: ${product.description}
- Key Benefits:
${product.benefits.map(b => `  • ${b}`).join('\n')}
- Store URL: ${product.url}

CRITICAL: Use the EXACT product form when describing usage:
${product.form === 'honey' ? '- This is HONEY - say "one teaspoon" or "a spoonful" - NEVER say "capsule" or "pill"' : ''}
${product.form === 'liquid' ? '- This is a LIQUID - say "one tablespoon" or "a serving" - NEVER say "capsule" or "pill"' : ''}
${product.form === 'drops' ? '- These are DROPS - say "a few drops" or "1-2 drops" - NEVER say "capsule" or "pill"' : ''}
${product.form === 'capsule' ? '- These are CAPSULES - you can say "capsule" or "pill"' : ''}
${product.form === 'powder' ? '- This is a POWDER - say "one scoop" - NEVER say "capsule" or "pill"' : ''}
${!product.form ? '- Be generic about dosage - say "one serving" or "as directed"' : ''}
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceType, sourceContent, interviewData, count = 3 } = body;

    // Get product context if applicable
    const productContext = buildProductContext(sourceContent, sourceType);

    // Get CTA URL info
    const ctaType = interviewData?.callToAction || 'awareness';
    const ctaInfo = CTA_URLS[ctaType] || CTA_URLS.awareness;

    // Build CTA instruction based on whether we have a URL
    let ctaInstruction: string;
    if (ctaInfo.url) {
      // We have a real URL to include
      ctaInstruction = `\nCRITICAL CTA REQUIREMENT:
- The CTA type is "${ctaType}"
- You MUST include this EXACT URL in EVERY post: ${ctaInfo.url}
- The post MUST end with a clear call to action that includes the URL
- Example ending: "Get started: ${ctaInfo.url}" or "Learn more: ${ctaInfo.url}"
- Do NOT use placeholder text like "[URL]" or "link in bio" - use the ACTUAL URL`;
    } else if (ctaType === 'download_guide') {
      // Guide CTA but no URL - encourage engagement without a broken link
      ctaInstruction = `\nCTA REQUIREMENT:
- The CTA type is "${ctaType}"
- End with a soft CTA that encourages engagement WITHOUT a URL
- Examples: "Comment 'GUIDE' to learn how to get the free guide", "Follow for more health tips for the road", "Save this post for later"
- Do NOT include any URLs or "link in bio" - this is a standalone engagement post`;
    } else {
      // Awareness only - no CTA needed
      ctaInstruction = '\n- No URL required for this post (awareness/engagement only)';
    }

    const prompt = `Generate ${count} different social media post options for Let's Truck Health Coaching.

SOURCE TYPE: ${sourceType}
SOURCE CONTENT: ${sourceContent}
${productContext}
INTERVIEW DATA:
- Primary Message: ${interviewData?.primaryMessage || 'Not specified'}
- Target Emotion: ${interviewData?.targetEmotion || 'Not specified'}
- Supporting Evidence: ${interviewData?.supportingEvidence || 'Not specified'}
- Call to Action Type: ${ctaType}
- Target Audience: ${interviewData?.targetAudience || 'Professional truck drivers'}
- Tone: ${interviewData?.tone || 'Direct and confident'}
${ctaInstruction}

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
5. ${ctaInfo.url ? `END with a CTA that includes the URL: ${ctaInfo.url}` : 'Be awareness/engagement focused'}

Respond in this exact JSON format:
{
  "options": [
    {
      "id": "1",
      "text": "The full post text including URL if required",
      "type": "stat",
      "emotion": "The primary emotion this content evokes",
      "cta": "The call to action text",
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
