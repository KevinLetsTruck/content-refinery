/**
 * AI Email Sequence Generator
 * Generates nurture email sequences using Claude API
 */

import Anthropic from "@anthropic-ai/sdk";
import { extractJsonFromText } from "@/lib/utils/api";
import { getRecommendedProducts, Product } from "@/lib/products/catalog";

// Email sequence configurations
const SEQUENCE_CONFIGS = {
  3: {
    delays: [2, 4, 7],
    purposes: ["value", "value", "soft_pitch"] as const,
  },
  5: {
    delays: [2, 4, 7, 10, 14],
    purposes: ["value", "value", "engagement", "soft_pitch", "hard_pitch"] as const,
  },
  7: {
    delays: [2, 4, 6, 9, 12, 15, 21],
    purposes: ["value", "value", "engagement", "value", "soft_pitch", "engagement", "hard_pitch"] as const,
  },
} as const;

export type EmailPurpose = "value" | "engagement" | "soft_pitch" | "hard_pitch";

export interface GeneratedEmail {
  order: number;
  sendDelayDays: number;
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  purpose: EmailPurpose;
}

export interface SequenceGeneratorInput {
  leadMagnetTitle: string;
  leadMagnetSlug?: string;
  leadMagnetDescription?: string;
  leadMagnetKeyPoints?: string[];
  sequenceLength: 3 | 5 | 7;
  productId?: string;
  productName?: string;
  productUrl?: string;
  customPrompt?: string;
}

export interface GeneratedSequence {
  name: string;
  emails: GeneratedEmail[];
  recommendedProducts: Product[];
}

// Brand colors for email templates
const BRAND_COLORS = {
  background: "#0d0d0d",
  cardBackground: "#1f1f1f",
  accent: "#ff4500",
  text: "#ffffff",
  textMuted: "#a0a0a0",
  border: "#2a2a2a",
};

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

const EMAIL_SYSTEM_PROMPT = `
You are writing nurture emails for Let's Truck Health Coaching, founded by Kevin Rutherford, FNTP.

## YOUR VOICE
- Direct, no-BS, tough-love approach (like Dave Ramsey meets Larry Winget)
- Deeply knowledgeable about health for professional drivers
- Confrontational when needed, but always supportive
- Anti-establishment medicine, pro-functional health
- NEVER wishy-washy or corporate-speak

## CRITICAL TERMINOLOGY RULES
NEVER use: "trucker", "truckers"
ALWAYS use: "driver", "professional driver", "O/O", "Owner-Operator", "The Tribe"

## SIGNATURE PHRASES TO USE
- "You're the owner-operator of your own health"
- "Proper human diet"
- "The Tribe"
- "Diesel in your blood"
- "Nobody's coming to save you"
- "Your body, your rig"

## EMAIL STRUCTURE
Every email should have:
1. Strong subject line (creates curiosity or urgency)
2. Personal greeting ("Hey [First Name]" or just "Hey")
3. Hook in first sentence
4. Valuable content (teach something)
5. Clear call-to-action
6. Sign off as "Kevin Rutherford, FNTP / Let's Truck Health Coaching"

## EMAIL PURPOSES
- "value": Pure education, no selling. Build trust by teaching.
- "engagement": Ask questions, encourage replies, build relationship.
- "soft_pitch": Mention product naturally within valuable content.
- "hard_pitch": Direct product promotion with clear benefits and CTA.

## AVOID IN EMAILS
- Generic health advice
- Medical disclaimers (beyond basic "consult your doctor")
- Wishy-washy language
- Corporate marketing speak
- Long paragraphs (keep them punchy)
`;

const PURPOSE_GUIDELINES: Record<EmailPurpose, string> = {
  value: `
    This is a VALUE email. Pure education, no selling.
    - Share a specific, actionable tip related to the lead magnet topic
    - Include a surprising fact or statistic
    - Make them feel smarter for reading it
    - Subtly position yourself as the expert
    - CTA: Ask a question or suggest implementing one thing
  `,
  engagement: `
    This is an ENGAGEMENT email. Build relationship.
    - Ask a genuine question about their situation
    - Share a brief personal story or client transformation
    - Create dialogue (encourage replies)
    - Make them feel heard and understood
    - CTA: Ask them to reply with their biggest challenge
  `,
  soft_pitch: `
    This is a SOFT PITCH email. Mention product naturally.
    - Lead with value content (80% of email)
    - Naturally mention the product as a solution
    - Share how it fits into a bigger strategy
    - Keep it conversational, not salesy
    - CTA: "Check it out if you're interested" style
  `,
  hard_pitch: `
    This is a HARD PITCH email. Direct product promotion.
    - Open with the problem this product solves
    - Clearly state the benefits (not just features)
    - Address common objections
    - Create urgency without being sleazy
    - Strong CTA: "Get yours now" style with link
  `,
};

function buildEmailPrompt(
  input: SequenceGeneratorInput,
  emailIndex: number,
  purpose: EmailPurpose,
  sendDelayDays: number
): string {
  const dayText = sendDelayDays === 1 ? "1 day" : `${sendDelayDays} days`;

  let productContext = "";
  if ((purpose === "soft_pitch" || purpose === "hard_pitch") && input.productName) {
    productContext = `
## PRODUCT TO PROMOTE
Name: ${input.productName}
URL: ${input.productUrl || "store.letstruck.com"}
${input.productId ? `ID: ${input.productId}` : ""}

Naturally incorporate this product where relevant.
`;
  }

  return `
${EMAIL_SYSTEM_PROMPT}

## THIS EMAIL
Email #${emailIndex + 1} of ${input.sequenceLength}
Purpose: ${purpose.toUpperCase()}
Send timing: ${dayText} after previous email

${PURPOSE_GUIDELINES[purpose]}

## CONTEXT
Lead Magnet: "${input.leadMagnetTitle}"
${input.leadMagnetDescription ? `Description: ${input.leadMagnetDescription}` : ""}
${input.leadMagnetKeyPoints?.length ? `Key Points:\n${input.leadMagnetKeyPoints.map(p => `- ${p}`).join("\n")}` : ""}

${productContext}

${input.customPrompt ? `## ADDITIONAL INSTRUCTIONS\n${input.customPrompt}` : ""}

Generate the email now. Return JSON:
{
  "subject": "Email subject line (max 60 chars, create curiosity)",
  "preheader": "Preview text shown after subject (max 100 chars)",
  "bodyText": "Plain text version of the email body",
  "bodyHtml": "HTML version with proper formatting (use <p>, <strong>, <a> tags)"
}

IMPORTANT:
- Use {{firstName}} placeholder for personalization (will be replaced with actual name)
- For the HTML body, use inline styles matching dark theme colors
- Keep paragraphs short (2-3 sentences max)
- Include a clear CTA button or link where appropriate
`;
}

function wrapEmailHtml(bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${BRAND_COLORS.background};
      color: ${BRAND_COLORS.text};
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 30px;
      border-bottom: 1px solid ${BRAND_COLORS.border};
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: ${BRAND_COLORS.accent};
      text-decoration: none;
    }
    .content {
      background-color: ${BRAND_COLORS.cardBackground};
      border-radius: 12px;
      padding: 30px;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 15px 0;
      color: ${BRAND_COLORS.textMuted};
    }
    p.greeting {
      color: ${BRAND_COLORS.text};
      font-size: 18px;
    }
    strong {
      color: ${BRAND_COLORS.text};
    }
    a {
      color: ${BRAND_COLORS.accent};
    }
    .cta-button {
      display: inline-block;
      background-color: ${BRAND_COLORS.accent};
      color: ${BRAND_COLORS.text} !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid ${BRAND_COLORS.border};
    }
    .signature-name {
      font-weight: bold;
      color: ${BRAND_COLORS.text};
      margin: 0;
    }
    .signature-title {
      color: ${BRAND_COLORS.textMuted};
      font-size: 14px;
      margin: 5px 0 0 0;
    }
    .footer {
      text-align: center;
      padding-top: 30px;
      margin-top: 30px;
      border-top: 1px solid ${BRAND_COLORS.border};
      font-size: 12px;
      color: ${BRAND_COLORS.textMuted};
    }
    .footer a {
      color: ${BRAND_COLORS.textMuted};
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://letstruck.com" class="logo">LET'S TRUCK</a>
    </div>
    <div class="content">
      ${bodyContent}
      <div class="signature">
        <p class="signature-name">Kevin Rutherford, FNTP</p>
        <p class="signature-title">Let's Truck Health Coaching</p>
      </div>
    </div>
    <div class="footer">
      <p>
        You're receiving this because you signed up at letstruck.com.<br>
        <a href="{{unsubscribe_url}}">Unsubscribe</a> |
        <a href="https://letstruck.com/privacy">Privacy Policy</a>
      </p>
      <p style="margin-top: 10px;">
        Let's Truck Health Coaching<br>
        &copy; ${new Date().getFullYear()} Let's Truck. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate a complete email nurture sequence
 */
export async function generateEmailSequence(
  input: SequenceGeneratorInput
): Promise<GeneratedSequence> {
  const anthropic = getAnthropicClient();
  const config = SEQUENCE_CONFIGS[input.sequenceLength];
  const emails: GeneratedEmail[] = [];

  // Get recommended products for this lead magnet
  const recommendedProducts = input.leadMagnetSlug
    ? getRecommendedProducts(input.leadMagnetSlug).slice(0, 5)
    : [];

  // If no product specified but we have recommendations, use the first one
  const productToPromote = input.productName
    ? { name: input.productName, url: input.productUrl }
    : recommendedProducts.length > 0
    ? { name: recommendedProducts[0].name, url: recommendedProducts[0].url }
    : null;

  // Generate each email in the sequence
  for (let i = 0; i < input.sequenceLength; i++) {
    const purpose = config.purposes[i];
    const sendDelayDays = config.delays[i];

    // For pitch emails, include product info
    const emailInput: SequenceGeneratorInput = {
      ...input,
      productName: (purpose === "soft_pitch" || purpose === "hard_pitch") && productToPromote
        ? productToPromote.name
        : undefined,
      productUrl: (purpose === "soft_pitch" || purpose === "hard_pitch") && productToPromote
        ? productToPromote.url
        : undefined,
    };

    const prompt = buildEmailPrompt(emailInput, i, purpose, sendDelayDays);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const { data, error } = extractJsonFromText<{
      subject: string;
      preheader: string;
      bodyText: string;
      bodyHtml: string;
    }>(content.text, "object");

    if (error || !data) {
      console.error(`Failed to parse email ${i + 1}:`, error);
      throw new Error(`Failed to generate email ${i + 1}: ${error}`);
    }

    emails.push({
      order: i + 1,
      sendDelayDays,
      subject: data.subject,
      preheader: data.preheader,
      bodyText: data.bodyText,
      bodyHtml: wrapEmailHtml(data.bodyHtml),
      purpose,
    });

    // Small delay between API calls to avoid rate limiting
    if (i < input.sequenceLength - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return {
    name: `${input.leadMagnetTitle} Nurture Sequence`,
    emails,
    recommendedProducts,
  };
}

/**
 * Regenerate a single email in a sequence
 */
export async function regenerateEmail(
  input: SequenceGeneratorInput,
  emailIndex: number,
  purpose: EmailPurpose,
  sendDelayDays: number,
  feedback?: string
): Promise<GeneratedEmail> {
  const anthropic = getAnthropicClient();

  const inputWithFeedback: SequenceGeneratorInput = {
    ...input,
    customPrompt: feedback
      ? `${input.customPrompt || ""}\n\nUSER FEEDBACK ON PREVIOUS VERSION:\n${feedback}`
      : input.customPrompt,
  };

  const prompt = buildEmailPrompt(inputWithFeedback, emailIndex, purpose, sendDelayDays);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const { data, error } = extractJsonFromText<{
    subject: string;
    preheader: string;
    bodyText: string;
    bodyHtml: string;
  }>(content.text, "object");

  if (error || !data) {
    throw new Error(`Failed to regenerate email: ${error}`);
  }

  return {
    order: emailIndex + 1,
    sendDelayDays,
    subject: data.subject,
    preheader: data.preheader,
    bodyText: data.bodyText,
    bodyHtml: wrapEmailHtml(data.bodyHtml),
    purpose,
  };
}

/**
 * Get sequence configuration
 */
export function getSequenceConfig(length: 3 | 5 | 7) {
  return SEQUENCE_CONFIGS[length];
}
