import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const PLATFORM_GUIDELINES: Record<string, string> = {
  twitter: 'Max 280 characters. Hook in first line. Use line breaks for readability. No hashtags in main text (add separately).',
  facebook: 'Can be longer (1-3 paragraphs). More conversational. Can include link in text. 3-5 hashtags max.',
  instagram: 'Visual-first caption. Use emojis sparingly. Line breaks for readability. Hashtags at end (up to 10 relevant ones).',
  linkedin: 'Professional tone but still Kevin\'s direct voice. Can be longer form. Industry insights angle.',
};

async function generatePostContent(params: {
  platform: string;
  phase: {
    name: string;
    purpose: string;
    themes: string[];
    hooks: string[];
    dayRange: [number, number];
  };
  day: number;
  postNum: number;
  sourceType: string;
  sourceData: Record<string, unknown>;
  contentStrategy: {
    keyMessages: string[];
    phases: Array<{ dayRange: [number, number] }>;
  };
  interviewAnswers: Record<string, unknown>;
}) {
  const { platform, phase, day, sourceType, sourceData, contentStrategy, interviewAnswers } = params;

  // Detect content category from source data and themes
  const categoryKeywords = {
    health: ['health', 'nutrition', 'diet', 'gut', 'sleep', 'weight', 'energy', 'supplement'],
    business: ['fuel', 'mpg', 'mileage', 'profit', 'cost', 'rate', 'revenue', 'business', 'expense'],
    industry: ['regulation', 'fmcsa', 'dot', 'eld', 'compliance', 'law', 'rule'],
    lifestyle: ['life', 'road', 'family', 'community', 'tribe'],
  };

  const allText = `${phase.themes.join(' ')} ${contentStrategy.keyMessages.join(' ')} ${JSON.stringify(sourceData)}`.toLowerCase();
  let contentCategory = 'general';
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => allText.includes(k))) {
      contentCategory = category;
      break;
    }
  }

  // Category-specific brand voice guidance
  const categoryVoice: Record<string, string> = {
    health: `
- Focus on health, nutrition, and wellness topics
- Phrases: "proper human diet", "owner-operator of your health", "your body, your rig"
- Challenge conventional medical establishment`,
    business: `
- Focus on business operations, profitability, fuel efficiency
- Phrases: "know your numbers", "run it like a business", "every mile counts"
- Pro owner-operator, practical business advice`,
    industry: `
- Focus on regulations, compliance, market trends
- Phrases: "know the rules", "stay compliant, stay profitable"
- Pro-driver perspective on industry changes`,
    lifestyle: `
- Focus on life on the road, driver community
- Phrases: "The Tribe", "diesel in your blood"
- Authentic community voice`,
    general: `
- Adapt to the specific topic
- Direct, practical advice`,
  };

  const prompt = `Generate a single social media post for Let's Truck.

PLATFORM: ${platform}
PLATFORM GUIDELINES: ${PLATFORM_GUIDELINES[platform] || PLATFORM_GUIDELINES.twitter}

CAMPAIGN PHASE: ${phase.name}
PHASE PURPOSE: ${phase.purpose}
DAY: ${day} of ${contentStrategy.phases[contentStrategy.phases.length - 1].dayRange[1]}
THEMES FOR THIS PHASE: ${phase.themes.join(', ')}
HOOKS TO USE: ${phase.hooks.join(', ')}

SOURCE TYPE: ${sourceType}
SOURCE DATA: ${JSON.stringify(sourceData, null, 2)}
KEY MESSAGES: ${contentStrategy.keyMessages.join(', ')}

INTERVIEW CONTEXT: ${JSON.stringify(interviewAnswers, null, 2)}

CONTENT CATEGORY: ${contentCategory.toUpperCase()}

BRAND VOICE:
- Direct, no-BS, confident (Larry Winget inspired)
- NEVER say "trucker" - use "driver" or "professional driver"
- NEVER say "truckers" - use "drivers", "O/Os", "owner-operators", "The Tribe"
- No wishy-washy qualifiers ("maybe", "might", "could possibly")
${categoryVoice[contentCategory] || categoryVoice.general}

Generate a post that fits the phase purpose and builds toward the campaign goal.

Respond in this exact JSON format:
{
  "text": "The full post text",
  "hashtags": ["relevant", "hashtags"],
  "visualPrompt": "Brief description for AI image generation"
}

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

  return JSON.parse(jsonText);
}

async function generateEmailContent(params: {
  emailConfig: {
    day: number;
    purpose: string;
    subject: string;
  };
  sourceType: string;
  sourceData: Record<string, unknown>;
  contentStrategy: {
    keyMessages: string[];
  };
  productName: string | null;
}) {
  const { emailConfig, sourceType, sourceData, contentStrategy, productName } = params;

  const purposeGuidelines: Record<string, string> = {
    value: 'Pure education, no selling. Provide actionable insights. Build trust and authority.',
    engagement: 'Build relationship, encourage replies. Ask questions. Be personal.',
    soft_pitch: 'Mention product naturally within valuable content. Don\'t be pushy.',
    hard_pitch: 'Direct promotion with strong CTA. Create urgency. Clear benefits and link.',
  };

  const prompt = `Generate an email for Let's Truck nurture sequence.

EMAIL PURPOSE: ${emailConfig.purpose}
PURPOSE GUIDELINES: ${purposeGuidelines[emailConfig.purpose] || purposeGuidelines.value}
SEND DAY: Day ${emailConfig.day} of sequence
SUBJECT LINE: ${emailConfig.subject}

SOURCE TYPE: ${sourceType}
SOURCE DATA: ${JSON.stringify(sourceData, null, 2)}
KEY MESSAGES: ${contentStrategy.keyMessages.join(', ')}
${productName ? `PRODUCT TO PROMOTE: ${productName}` : ''}

BRAND VOICE:
- Direct, no-BS, confident
- NEVER say "trucker" - use "driver" or "professional driver"
- Write like Kevin is personally emailing this driver
- Conversational but authoritative
- Sign off as "Kevin" or "Kevin Rutherford"

EMAIL STRUCTURE:
- Personal greeting (Hey, or Hey [first_name])
- 2-4 short paragraphs
- Clear single CTA if appropriate for purpose
- Kevin's signature

Respond in this exact JSON format:
{
  "html": "Full HTML email content with proper tags",
  "text": "Plain text version"
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

  return JSON.parse(jsonText);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceType,
      sourceData,
      campaignConfig,
      contentStrategy,
      emailSequence,
      interviewAnswers,
    } = body;

    // 1. Create the campaign record
    const campaign = await prisma.campaign.create({
      data: {
        name: contentStrategy.campaignName,
        description: contentStrategy.keyMessages.join(' | '),
        campaignType: sourceType === 'product' ? 'product_launch' : 'educational_series',
        goal: campaignConfig.ctaType === 'email_signup' ? 'email_signups' : 'sales',
        sourceType,
        leadMagnetId: sourceType === 'guide' ? sourceData?.id as string : null,
        productShopifyId: sourceType === 'product' ? sourceData?.shopifyId as string : null,
        campaignStyle: campaignConfig.style,
        ctaType: campaignConfig.ctaType,
        ctaUrl: campaignConfig.ctaUrl,
        startDate: new Date(),
        endDate: new Date(Date.now() + campaignConfig.duration * 24 * 60 * 60 * 1000),
        durationDays: campaignConfig.duration,
        platforms: campaignConfig.platforms,
        postsPerDayTwitter: campaignConfig.frequency.twitter || 1,
        postsPerDayFacebook: campaignConfig.frequency.facebook || 1,
        postsPerDayInstagram: campaignConfig.frequency.instagram || 1,
        strategy: contentStrategy,
        status: 'generating',
        keyMessages: contentStrategy.keyMessages,
      },
    });

    // 2. Create campaign phases
    for (const phase of contentStrategy.phases) {
      await prisma.campaignPhase.create({
        data: {
          campaignId: campaign.id,
          name: phase.name,
          orderIndex: contentStrategy.phases.indexOf(phase),
          purpose: phase.purpose,
          startDay: phase.dayRange[0],
          endDay: phase.dayRange[1],
          themes: phase.themes,
          hooks: phase.hooks,
          ctas: [],
        },
      });
    }

    // 3. Generate posts for each day/platform
    const phases = await prisma.campaignPhase.findMany({
      where: { campaignId: campaign.id },
      orderBy: { orderIndex: 'asc' },
    });

    let totalPosts = 0;

    for (const phase of phases) {
      for (let day = phase.startDay; day <= phase.endDay; day++) {
        for (const platform of campaignConfig.platforms) {
          const postsForPlatform = campaignConfig.frequency[platform] || 1;

          for (let postNum = 0; postNum < postsForPlatform; postNum++) {
            // Generate post content using AI
            const postContent = await generatePostContent({
              platform,
              phase: {
                name: phase.name,
                purpose: phase.purpose,
                themes: phase.themes,
                hooks: phase.hooks,
                dayRange: [phase.startDay, phase.endDay],
              },
              day,
              postNum,
              sourceType,
              sourceData: sourceData || {},
              contentStrategy,
              interviewAnswers: interviewAnswers || {},
            });

            const scheduledFor = new Date();
            scheduledFor.setDate(scheduledFor.getDate() + day - 1);
            scheduledFor.setHours(9 + (postNum * 4)); // Space posts throughout day

            await prisma.campaignPost.create({
              data: {
                campaignId: campaign.id,
                phaseId: phase.id,
                platform,
                content: postContent.text,
                contentType: 'post',
                hashtags: postContent.hashtags,
                dayNumber: day,
                scheduledFor,
                status: 'draft',
                visualType: 'gamma',
                visualPrompt: postContent.visualPrompt,
              },
            });

            totalPosts++;
          }
        }
      }
    }

    // 4. Create email sequence if enabled
    if (campaignConfig.includeEmail && emailSequence) {
      const sequence = await prisma.emailSequence.create({
        data: {
          name: `${contentStrategy.campaignName} - Email Sequence`,
          campaignId: campaign.id,
          leadMagnetId: sourceType === 'guide' ? sourceData?.id as string : null,
          sequenceLength: emailSequence.length,
          productName: campaignConfig.productName,
          productUrl: campaignConfig.productId
            ? `https://store.letstruck.com/products/${campaignConfig.productId}`
            : null,
          status: 'draft',
        },
      });

      // Generate emails
      for (const emailConfig of emailSequence.emails) {
        const emailContent = await generateEmailContent({
          emailConfig,
          sourceType,
          sourceData: sourceData || {},
          contentStrategy,
          productName: campaignConfig.productName,
        });

        await prisma.email.create({
          data: {
            sequenceId: sequence.id,
            order: emailSequence.emails.indexOf(emailConfig) + 1,
            sendDelayDays: emailConfig.day,
            subject: emailConfig.subject,
            preheader: emailConfig.preheader,
            bodyHtml: emailContent.html,
            bodyText: emailContent.text,
            purpose: emailConfig.purpose,
            status: 'draft',
          },
        });
      }
    }

    // 5. Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'review',
        totalPosts,
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      totalPosts,
    });
  } catch (error) {
    console.error('Campaign generation error:', error);
    return NextResponse.json({ error: 'Failed to generate campaign' }, { status: 500 });
  }
}
