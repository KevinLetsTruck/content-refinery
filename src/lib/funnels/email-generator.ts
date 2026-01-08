/**
 * Email Sequence Generator
 * Generate email nurture sequence with Claude
 */

import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuid } from "uuid";
import { FunnelType, FunnelEmail } from "./types";

const anthropic = new Anthropic();

interface GenerateEmailSequenceParams {
  funnelName: string;
  funnelType: FunnelType;
  topic: string;
  leadMagnetTitle: string;
  landingPageUrl: string;
  emailCount: number;
  keyMessages?: string[];
}

const BRAND_VOICE_PROMPT = `
BRAND VOICE (Let's Truck / Kevin Rutherford):
- Authentic, experienced trucker perspective
- Educational but conversational
- Direct and practical - drivers are busy
- Use "driver" or "owner-operator" NOT "trucker"
- No CB radio handles or truck nicknames
- Reference NDK (Nutrient Dense Keto) protocol
- Focus on actionable advice
- Challenge mainstream nutrition advice
- Emphasize: animal-based, 70-80% fats, low carb
- Anti-establishment, questioning conventional medical wisdom
- Confident, no-BS tone like Larry Winget
`;

const EMAIL_SEQUENCE_STRUCTURES: Record<FunnelType, string[]> = {
  lead_magnet: [
    "Welcome + deliver lead magnet",
    "Quick win from the content",
    "Story/testimonial",
    "Deeper value + myth busting",
    "Soft CTA to next step",
  ],
  challenge: [
    "Welcome to challenge + Day 1 instructions",
    "Day 2-3 check-in + encouragement",
    "Mid-challenge momentum + testimonial",
    "Pre-final push + anticipation",
    "Challenge complete + next steps offer",
  ],
  product_launch: [
    "Welcome + build anticipation",
    "Problem awareness + story",
    "Solution introduction",
    "Social proof + testimonials",
    "Launch offer + urgency",
  ],
};

/**
 * Generate email nurture sequence with Claude
 */
export async function generateEmailSequence(
  params: GenerateEmailSequenceParams
): Promise<FunnelEmail[]> {
  const {
    funnelName,
    funnelType,
    topic,
    leadMagnetTitle,
    landingPageUrl,
    emailCount,
    keyMessages,
  } = params;

  const structure = EMAIL_SEQUENCE_STRUCTURES[funnelType];
  const emailPurposes = structure.slice(0, emailCount);

  // Send delays in hours: 0, 24, 48, 72, 96...
  const sendDelays = emailPurposes.map((_, i) => i * 24);

  const prompt = `You are writing an email nurture sequence for "${funnelName}" - a ${funnelType.replace("_", " ")} funnel.

${BRAND_VOICE_PROMPT}

CONTEXT:
- Topic: ${topic}
- Lead Magnet: "${leadMagnetTitle}"
- Landing Page: ${landingPageUrl}
${keyMessages ? `- Key Messages to incorporate: ${keyMessages.join(", ")}` : ""}

EMAIL SEQUENCE STRUCTURE:
${emailPurposes.map((purpose, i) => `Email ${i + 1} (${sendDelays[i]} hours after signup): ${purpose}`).join("\n")}

For EACH email, provide:
1. subject: Compelling subject line (40-60 chars, create curiosity/urgency)
2. previewText: Preview text that shows after subject (30-50 chars)
3. body: Full email body in HTML format with these elements:
   - Greeting (Hey {first_name}, or similar)
   - Hook that connects to their situation
   - Main content (value, story, or insight)
   - Clear CTA (if applicable for this email)
   - Signature from Kevin Rutherford

IMPORTANT:
- Email 1 should include the lead magnet download link: ${landingPageUrl}
- Keep emails scannable with short paragraphs
- Use plain HTML (p, a, strong, br tags only - no fancy styling)
- Include {first_name} merge tag where appropriate
- Each email should be 150-300 words
- Build relationship and trust, not just sales

Return as JSON array with this structure:
[
  {
    "subject": "...",
    "previewText": "...",
    "body": "<p>...</p>",
    "purpose": "..."
  }
]`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Parse the response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Extract JSON from the response
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Failed to parse email sequence:", content.text);
    throw new Error("Failed to parse email sequence from Claude response");
  }

  const emailData = JSON.parse(jsonMatch[0]) as Array<{
    subject: string;
    previewText: string;
    body: string;
    purpose: string;
  }>;

  // Transform to FunnelEmail format
  const emails: FunnelEmail[] = emailData.map((email, index) => ({
    id: uuid(),
    order: index + 1,
    subject: email.subject,
    previewText: email.previewText,
    body: email.body,
    sendDelay: sendDelays[index],
    purpose: email.purpose || emailPurposes[index],
    status: "draft" as const,
  }));

  return emails;
}
