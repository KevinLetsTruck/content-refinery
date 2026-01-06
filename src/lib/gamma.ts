/**
 * Gamma.app API Client for Content Refinery
 * 
 * Generates PDFs, webpages, and social content via Gamma's AI
 * API Docs: https://developers.gamma.app/docs
 * 
 * Required environment variable:
 * - GAMMA_API_KEY
 */

const GAMMA_API_BASE = "https://public-api.gamma.app/v1.0";

interface GammaConfig {
  apiKey: string;
}

type GammaFormat = "presentation" | "document" | "webpage" | "social";
type ExportFormat = "pdf" | "pptx";
type TextMode = "generate" | "condense" | "preserve";
type TextAmount = "brief" | "medium" | "detailed" | "extensive";
type ImageSource = "aiGenerated" | "webSearch" | "noImages";

interface GenerateOptions {
  inputText: string;
  format: GammaFormat;
  textMode?: TextMode;
  themeId?: string;
  numCards?: number;
  exportAs?: ExportFormat;
  additionalInstructions?: string;
  textOptions?: {
    amount?: TextAmount;
    tone?: string;
    audience?: string;
    language?: string;
  };
  imageOptions?: {
    source?: ImageSource;
    model?: string;
    style?: string;
  };
  folderIds?: string[];
}

interface GenerationResult {
  generationId: string;
  status: "pending" | "completed" | "failed";
  gammaUrl?: string;
  pdfUrl?: string;
  pptxUrl?: string;
  credits?: {
    deducted: number;
    remaining: number;
  };
}

interface LeadMagnetOptions {
  title: string;
  topic: string;
  targetAudience?: string;
  tone?: string;
  sections?: string[];
  additionalContext?: string;
  numPages?: number;
}

interface LandingPageOptions {
  headline: string;
  subheadline: string;
  benefits: string[];
  ctaText: string;
  leadMagnetTitle: string;
  targetAudience?: string;
  additionalContent?: string;
}

interface SocialCarouselOptions {
  topic: string;
  keyPoints: string[];
  format: "instagram" | "linkedin" | "tiktok";
  tone?: string;
}

function getConfig(): GammaConfig {
  const apiKey = process.env.GAMMA_API_KEY;

  if (!apiKey) {
    throw new Error("GAMMA_API_KEY environment variable is not set");
  }

  return { apiKey };
}

/**
 * Start a generation job
 */
async function startGeneration(options: GenerateOptions): Promise<string> {
  const config = getConfig();

  const body: Record<string, unknown> = {
    inputText: options.inputText,
    format: options.format,
    textMode: options.textMode || "generate",
  };

  if (options.themeId) body.themeId = options.themeId;
  if (options.numCards) body.numCards = options.numCards;
  if (options.exportAs) body.exportAs = options.exportAs;
  if (options.additionalInstructions) body.additionalInstructions = options.additionalInstructions;
  if (options.textOptions) body.textOptions = options.textOptions;
  if (options.imageOptions) body.imageOptions = options.imageOptions;
  if (options.folderIds) body.folderIds = options.folderIds;

  const response = await fetch(`${GAMMA_API_BASE}/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": config.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[Gamma] Generation start failed:", error);
    throw new Error(`Gamma API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.generationId;
}

/**
 * Check generation status
 */
async function checkGeneration(generationId: string): Promise<GenerationResult> {
  const config = getConfig();

  const response = await fetch(`${GAMMA_API_BASE}/generations/${generationId}`, {
    headers: {
      "X-API-KEY": config.apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to check generation: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Wait for generation to complete (polls every 3 seconds)
 */
async function waitForGeneration(
  generationId: string,
  maxWaitMs: number = 120000
): Promise<GenerationResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const result = await checkGeneration(generationId);

    if (result.status === "completed") {
      return result;
    }

    if (result.status === "failed") {
      throw new Error("Generation failed");
    }

    // Wait 3 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Generation timed out");
}

/**
 * Generate content and wait for completion
 */
export async function generate(options: GenerateOptions): Promise<GenerationResult> {
  const generationId = await startGeneration(options);
  return waitForGeneration(generationId);
}

/**
 * Generate a PDF lead magnet guide
 */
export async function generateLeadMagnet(options: LeadMagnetOptions): Promise<GenerationResult> {
  const sectionsText = options.sections
    ? options.sections.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : "";

  const inputText = `
# ${options.title}

Topic: ${options.topic}

${options.additionalContext || ""}

${sectionsText ? `\nKey sections to cover:\n${sectionsText}` : ""}

Create a comprehensive, actionable guide that provides real value. Include:
- Clear explanations without medical jargon
- Practical tips that can be implemented immediately
- Specific examples relevant to the target audience
- Action steps at the end of each section
  `.trim();

  return generate({
    inputText,
    format: "document",
    textMode: "generate",
    exportAs: "pdf",
    numCards: options.numPages || 10,
    additionalInstructions: `
      This is a lead magnet PDF guide. Make it visually appealing and easy to scan.
      Use bullet points, callout boxes, and clear headers.
      End with a strong call-to-action to download the AudioRoad app.
    `,
    textOptions: {
      amount: "detailed",
      tone: options.tone || "friendly, authoritative, practical",
      audience: options.targetAudience || "truck drivers and owner-operators",
      language: "en",
    },
    imageOptions: {
      source: "aiGenerated",
      model: "imagen-4-pro",
      style: "photorealistic",
    },
  });
}

/**
 * Generate a landing page for lead capture
 */
export async function generateLandingPage(options: LandingPageOptions): Promise<GenerationResult> {
  const benefitsList = options.benefits.map((b) => `• ${b}`).join("\n");

  const inputText = `
# ${options.headline}

${options.subheadline}

## What You'll Learn:
${benefitsList}

## Get Your Free Guide: "${options.leadMagnetTitle}"

${options.additionalContent || ""}

[${options.ctaText}]
  `.trim();

  return generate({
    inputText,
    format: "webpage",
    textMode: "generate",
    additionalInstructions: `
      Create a high-converting landing page with:
      - Bold, attention-grabbing headline
      - Clear value proposition
      - Bullet points highlighting benefits
      - Trust indicators
      - Single, prominent call-to-action button
      - Mobile-friendly design
      - Professional but approachable feel
      Target audience: ${options.targetAudience || "truck drivers and owner-operators"}
    `,
    textOptions: {
      amount: "medium",
      tone: "persuasive, friendly, urgent",
      audience: options.targetAudience || "truck drivers and owner-operators",
      language: "en",
    },
    imageOptions: {
      source: "aiGenerated",
      model: "imagen-4-pro",
      style: "photorealistic",
    },
  });
}

/**
 * Generate social media carousel content
 */
export async function generateCarousel(options: SocialCarouselOptions): Promise<GenerationResult> {
  const pointsText = options.keyPoints.map((p, i) => `Slide ${i + 2}: ${p}`).join("\n");

  const aspectRatio = {
    instagram: "4x5",
    linkedin: "4x5",
    tiktok: "9x16",
  }[options.format];

  const inputText = `
Topic: ${options.topic}

Slide 1: Hook/Title slide

${pointsText}

Final Slide: Call to action - Download the free guide
  `.trim();

  return generate({
    inputText,
    format: "social",
    textMode: "generate",
    additionalInstructions: `
      Create a ${options.format} carousel with:
      - Eye-catching first slide that stops the scroll
      - One key point per slide
      - Large, readable text
      - Consistent visual style throughout
      - Strong CTA on final slide
      Aspect ratio: ${aspectRatio}
    `,
    textOptions: {
      amount: "brief",
      tone: options.tone || "punchy, educational, engaging",
      language: "en",
    },
    imageOptions: {
      source: "aiGenerated",
      model: "imagen-4-pro",
      style: "photorealistic",
    },
  });
}

/**
 * Get available themes
 */
export async function getThemes(): Promise<Array<{ id: string; name: string }>> {
  const config = getConfig();

  const response = await fetch(`${GAMMA_API_BASE}/themes`, {
    headers: {
      "X-API-KEY": config.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch themes");
  }

  return response.json();
}

/**
 * Get available folders
 */
export async function getFolders(): Promise<Array<{ id: string; name: string }>> {
  const config = getConfig();

  const response = await fetch(`${GAMMA_API_BASE}/folders`, {
    headers: {
      "X-API-KEY": config.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch folders");
  }

  return response.json();
}

/**
 * Check if Gamma is configured
 */
export function isConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get remaining credits
 */
export async function getCredits(): Promise<number> {
  // Make a simple themes request to check credits in response
  // The credits are returned in generation responses
  // For now, return -1 to indicate unknown
  return -1;
}
