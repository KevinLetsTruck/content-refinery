import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { findProductInText, getProductById, type Product } from '@/lib/products/catalog';

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

/**
 * Build product-focused CTA instructions when a specific product is selected
 */
function buildProductCtaInstructions(interviewData: Record<string, unknown>): string {
  const productId = interviewData?.selectedProductId as string | undefined;
  const productName = interviewData?.selectedProductName as string | undefined;
  const productUrl = interviewData?.selectedProductUrl as string | undefined;
  const productPrice = interviewData?.selectedProductPrice as string | undefined;

  if (!productId || !productName || !productUrl) {
    return '';
  }

  // Try to get full product details
  const product = getProductById(productId);
  const benefits = product?.benefits || [];
  const description = product?.description || '';

  return `
SELECTED PRODUCT FOR CTA:
- Product: ${productName}
- Price: $${productPrice}
- URL: ${productUrl}
${description ? `- Description: ${description}` : ''}
${benefits.length > 0 ? `- Key Benefits:\n${benefits.map(b => `  • ${b}`).join('\n')}` : ''}

PRODUCT CTA INSTRUCTIONS (CRITICAL):
1. Create a COMPELLING purchase-focused CTA that drives urgency
2. Use the EXACT product URL: ${productUrl}
3. Mention the product name naturally in the content
4. Highlight 1-2 key benefits that relate to the content topic
5. Use persuasive language:
   - "Grab yours now"
   - "Get your ${productName} today"
   - "Don't wait another day"
   - "Your gut/heart/energy deserves this"
   - "Start your transformation"
6. Price anchoring is OK: "For less than a day's per diem" or "Under $${productPrice}"

CTA EXAMPLES FOR ${productName}:
- "Ready to fix this? Get ${productName}: ${productUrl}"
- "Your solution is one click away. ${productName}: ${productUrl}"
- "Stop suffering. Start with ${productName}: ${productUrl}"
- "Kevin's daily stack includes this for a reason. Get yours: ${productUrl}"
`;
}

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

// Content length configuration
const CONTENT_LENGTH_CONFIG: Record<string, { minWords: number; maxWords: number; description: string }> = {
  short: { minWords: 50, maxWords: 150, description: "a concise social media post" },
  medium: { minWords: 150, maxWords: 400, description: "a longer social post or LinkedIn update" },
  long: { minWords: 400, maxWords: 700, description: "a detailed thread-style post or longer narrative" },
  article: { minWords: 700, maxWords: 1500, description: "a full article or blog post" },
};

// Quick idea type descriptions
const QUICK_IDEA_TYPE_INSTRUCTIONS: Record<string, string> = {
  idea: "Transform this idea into compelling content that educates and engages.",
  news_article: `This is a news article that needs to be SUMMARIZED with COMMENTARY in Kevin's voice.
Your task:
1. First, summarize the key points of the article (2-3 sentences max)
2. Then provide Kevin's perspective and commentary on the topic
3. Connect it to the relevant audience (drivers if health/trucking, everyone if general topic)
4. Challenge mainstream narratives where appropriate
5. Don't just summarize - add VALUE through analysis and insight`,
  stat: "Lead with this statistic and make it impactful. Explain why it matters.",
  quote: "Present this as a powerful quotable statement. Add context or expand on the idea.",
  tip: "Turn this into actionable advice. Make it specific and immediately useful.",
};

// Content category configurations with specific voice and focus
const CONTENT_CATEGORY_CONFIG: Record<string, {
  focus: string;
  audience: string;
  voiceNotes: string;
  hashtagSuggestions: string[];
}> = {
  health: {
    focus: "Driver health, nutrition, functional medicine, supplements, and wellness",
    audience: "Professional truck drivers (O/Os, company drivers, The Tribe)",
    voiceNotes: `- Challenge conventional medical establishment and mainstream health narratives
- Reference driver-specific health challenges (sitting, sleep deprivation, diesel exposure, truck stop food)
- Connect everything to practical application for life on the road
- Can promote Let's Truck products when relevant`,
    hashtagSuggestions: ["driverhealth", "truckerlife", "letstruck", "properhumandiet", "functionalmedicine"],
  },
  trucking: {
    focus: "Trucking industry news, regulations, lifestyle, equipment, and business",
    audience: "Professional truck drivers and owner-operators",
    voiceNotes: `- Speak as a trucking industry insider with 30+ years experience
- Stand up for drivers against corporate trucking and overregulation
- Focus on practical business and lifestyle tips for life on the road
- Can be critical of FMCSA, brokers, and mega-carriers when warranted
- DO NOT make this about health unless the topic specifically involves health`,
    hashtagSuggestions: ["trucking", "owneroperator", "trucklife", "cdldriver", "truckingindustry"],
  },
  finance: {
    focus: "Personal finance, taxes, retirement planning, investing, and money management",
    audience: "Owner-operators and self-employed drivers managing their own money",
    voiceNotes: `- Focus on practical money advice for self-employed people
- Address unique O/O financial challenges (quarterly taxes, equipment depreciation, fuel costs)
- No-BS approach to building wealth and avoiding financial pitfalls
- DO NOT make this about health - keep it focused on money and finances`,
    hashtagSuggestions: ["financialfreedom", "smallbusinessfinance", "taxes", "retirement", "owneroperator"],
  },
  business: {
    focus: "Small business, entrepreneurship, O/O business operations, and success mindset",
    audience: "Owner-operators and entrepreneurs running their own trucking businesses",
    voiceNotes: `- Speak from experience running a successful O/O operation
- Focus on business strategy, efficiency, and profitability
- Challenge employees-mindset thinking
- DO NOT make this about health unless specifically relevant to business performance`,
    hashtagSuggestions: ["smallbusiness", "entrepreneur", "owneroperator", "businessmindset", "truckingindustry"],
  },
  politics: {
    focus: "Political commentary, policy analysis, regulations, and advocacy",
    audience: "Drivers and citizens who care about policy affecting trucking and freedom",
    voiceNotes: `- Take strong positions - no fence-sitting
- Focus on policies that affect drivers, small business, and individual freedom
- Can be critical of both parties when warranted
- Connect to real-world impact on drivers and small business
- DO NOT make this about health unless the political topic involves health policy`,
    hashtagSuggestions: ["politics", "trucking", "freedom", "regulation", "policy"],
  },
  general: {
    focus: "General commentary, observations, and content that doesn't fit other categories",
    audience: "General audience interested in Kevin's perspective",
    voiceNotes: `- Maintain the direct, no-BS voice
- Can cover any topic
- Apply critical thinking and challenge conventional wisdom
- DO NOT default to health content - stay on the actual topic`,
    hashtagSuggestions: ["thoughts", "perspective", "commentary"],
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceType,
      sourceContent,
      interviewData,
      landingPageUrl,
      quickIdeaType = 'idea',
      contentLength = 'short',
      contentCategory = 'health',
      count = 3
    } = body;

    // Get content length config
    const lengthConfig = CONTENT_LENGTH_CONFIG[contentLength] || CONTENT_LENGTH_CONFIG.short;
    const ideaTypeInstruction = QUICK_IDEA_TYPE_INSTRUCTIONS[quickIdeaType] || QUICK_IDEA_TYPE_INSTRUCTIONS.idea;
    const categoryConfig = CONTENT_CATEGORY_CONFIG[contentCategory] || CONTENT_CATEGORY_CONFIG.health;

    // Get product context if applicable
    const productContext = buildProductContext(sourceContent, sourceType);

    // Get CTA URL info
    const ctaType = interviewData?.callToAction || 'awareness';
    const ctaInfo = CTA_URLS[ctaType] || CTA_URLS.awareness;

    // Check if a specific product was selected for visit_store CTA
    const selectedProductUrl = interviewData?.selectedProductUrl as string | undefined;
    const hasSelectedProduct = ctaType === 'Visit Store' && selectedProductUrl;

    // Determine the actual URL to use
    // Priority: 1. Selected product URL, 2. Landing page URL passed in, 3. Static CTA URL, 4. None
    const actualUrl = selectedProductUrl || landingPageUrl || ctaInfo.url;

    // Build product-specific CTA instructions if a product was selected
    const productCtaInstructions = hasSelectedProduct ? buildProductCtaInstructions(interviewData || {}) : '';

    // Build CTA instruction based on whether we have a URL
    let ctaInstruction: string;
    if (hasSelectedProduct && productCtaInstructions) {
      // Product-specific CTA with enhanced selling instructions
      ctaInstruction = productCtaInstructions;
    } else if (actualUrl) {
      // We have a URL to include (either landing page or static)
      ctaInstruction = `\nCRITICAL CTA REQUIREMENT:
- The CTA type is "${ctaType}"
- You MUST include this EXACT URL in EVERY post: ${actualUrl}
- The post MUST end with a clear call to action that includes the URL
- Example ending: "Get your free guide: ${actualUrl}" or "Download now: ${actualUrl}"
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

    // Build length instruction based on content type
    const lengthInstruction = contentLength === 'article'
      ? `LENGTH REQUIREMENT: Write ${lengthConfig.description} (${lengthConfig.minWords}-${lengthConfig.maxWords}+ words).
This should be a comprehensive piece with:
- A compelling hook/opening
- Multiple paragraphs with clear structure
- Supporting evidence and examples
- A strong conclusion
- Proper formatting with paragraph breaks`
      : `LENGTH REQUIREMENT: Write ${lengthConfig.description} (${lengthConfig.minWords}-${lengthConfig.maxWords} words).`;

    const prompt = `Generate ${count} different content options for Kevin Rutherford / Let's Truck.

CONTENT CATEGORY: ${contentCategory.toUpperCase()}
- Focus: ${categoryConfig.focus}
- Target Audience: ${categoryConfig.audience}

CONTENT TYPE: ${quickIdeaType}
${ideaTypeInstruction}

SOURCE CONTENT:
${sourceContent}
${productContext}
INTERVIEW DATA:
- Primary Message: ${interviewData?.primaryMessage || 'Not specified'}
- Target Emotion: ${interviewData?.targetEmotion || 'Not specified'}
- Supporting Evidence: ${interviewData?.supportingEvidence || 'Not specified'}
- Call to Action Type: ${ctaType}
- Target Audience: ${interviewData?.targetAudience || categoryConfig.audience}
- Tone: ${interviewData?.tone || 'Direct and confident'}
${hasSelectedProduct ? `- Selected Product: ${interviewData?.selectedProductName} ($${interviewData?.selectedProductPrice})` : ''}

${lengthInstruction}
${ctaInstruction}

BRAND VOICE (CRITICAL - FOLLOW EXACTLY):
- Direct, no-BS, confident (Larry Winget inspired)
- NEVER say "trucker" - use "driver" or "professional driver"
- NEVER say "truckers" - use "drivers", "O/Os", "owner-operators", "The Tribe"
- No wishy-washy qualifiers ("maybe", "might", "could possibly")
- Be authoritative and confident in statements
- Take strong positions - no fence-sitting

CATEGORY-SPECIFIC VOICE (${contentCategory.toUpperCase()}):
${categoryConfig.voiceNotes}

${contentCategory === 'health' ? `
HEALTH-SPECIFIC PHRASES TO USE:
- "proper human diet", "owner-operator of your health", "diesel in your blood"
- Challenge conventional medical establishment and mainstream health narratives
- Use real science and data, not mainstream talking points` : ''}

${quickIdeaType === 'news_article' ? `
NEWS COMMENTARY STRUCTURE:
1. Brief summary of what the article says (2-3 sentences)
2. Kevin's take: What they got wrong OR what they're not telling you
3. The real story: What this actually means
4. Actionable insight or takeaway` : ''}

CONTENT APPROACHES TO USE (pick different ones for variety):
- stat: Lead with a shocking statistic
- quote: A powerful, quotable statement
- hook: Attention-grabbing opening that creates curiosity
- tip: Actionable advice they can use immediately
- educational: Teaching a concept with depth
- commentary: Analysis and perspective on a topic

SUGGESTED HASHTAGS FOR ${contentCategory.toUpperCase()}: ${categoryConfig.hashtagSuggestions.join(', ')}

Generate ${count} DIFFERENT content variations. Each should:
1. Match the requested length (${lengthConfig.minWords}-${lengthConfig.maxWords} words)
2. Match the brand voice EXACTLY
3. STAY ON TOPIC - if the category is "${contentCategory}", keep the content focused on that topic
4. Include relevant hashtags from the suggested list (fewer for articles, more for short posts)
5. Have a clear emotional appeal
6. ${actualUrl ? `END with a CTA that includes the URL: ${actualUrl}` : 'Be awareness/engagement focused'}

Respond in this exact JSON format:
{
  "options": [
    {
      "id": "1",
      "text": "The full content text including URL if required",
      "type": "the approach used (stat/quote/hook/tip/educational/commentary)",
      "emotion": "The primary emotion this content evokes",
      "cta": "The call to action text",
      "hashtags": ["relevant", "hashtags", "without", "the", "hash"]
    }
  ]
}

Respond ONLY with valid JSON.`;

    // Increase max_tokens for longer content
    const maxTokens = contentLength === 'article' ? 8192 : contentLength === 'long' ? 4096 : 2048;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
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
