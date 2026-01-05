import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface RepurposeFormat {
  format: string;
  name: string;
  description: string;
  fromFormats: string[]; // What formats can be repurposed to this
  platforms: string[];
}

const REPURPOSE_FORMATS: RepurposeFormat[] = [
  {
    format: "twitter_thread",
    name: "Twitter Thread",
    description: "Multi-tweet thread breaking down key points",
    fromFormats: ["document", "presentation", "blog", "guide", "social_post"],
    platforms: ["twitter"],
  },
  {
    format: "carousel",
    name: "Social Carousel",
    description: "Visual slide-by-slide breakdown for Instagram/LinkedIn",
    fromFormats: ["document", "presentation", "guide", "thread", "social_post"],
    platforms: ["instagram", "facebook"],
  },
  {
    format: "video_script",
    name: "Video Script",
    description: "Script for a short-form video (60-90 seconds)",
    fromFormats: ["document", "thread", "social_post", "guide"],
    platforms: ["youtube", "instagram", "tiktok"],
  },
  {
    format: "blog_post",
    name: "Blog Post",
    description: "Long-form article expanding on the topic",
    fromFormats: ["presentation", "thread", "video_script"],
    platforms: ["blog"],
  },
  {
    format: "email_newsletter",
    name: "Email Newsletter",
    description: "Newsletter segment for email subscribers",
    fromFormats: ["document", "blog", "presentation", "guide", "social_post"],
    platforms: ["email"],
  },
  {
    format: "quick_tips",
    name: "Quick Tips Series",
    description: "3-5 individual tip posts from one piece",
    fromFormats: ["document", "presentation", "guide", "blog", "social_post"],
    platforms: ["twitter", "facebook", "instagram"],
  },
  {
    format: "infographic_brief",
    name: "Infographic Brief",
    description: "Key stats and facts for visual design",
    fromFormats: ["document", "blog", "guide", "presentation"],
    platforms: ["instagram", "facebook"],
  },
];

/**
 * Analyze content and suggest repurposing opportunities
 */
export async function analyzeRepurposeOpportunities(
  contentId: string
): Promise<{ suggestions: Array<{ id: string; formatName: string; platforms: string[]; targetFormat: string; reason: string; priority: number }>; created: number }> {
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
    include: {
      derivedContent: true,
      performance: true,
    },
  });

  if (!content) {
    throw new Error("Content not found");
  }

  const contentType = content.contentType || "social_post";

  // Get formats this content type can be repurposed to
  const eligibleFormats = REPURPOSE_FORMATS.filter(
    (f) =>
      f.fromFormats.includes(contentType) &&
      !content.derivedContent.some((d) => d.contentType === f.format)
  );

  const suggestions: Array<{ id: string; formatName: string; platforms: string[]; targetFormat: string; reason: string; priority: number }> = [];

  for (const format of eligibleFormats) {
    // Calculate priority based on content characteristics
    let priority = 50;

    // Boost priority for high-performing content
    if (content.performance) {
      const engagementRate =
        content.performance.impressions > 0
          ? ((content.performance.likes + content.performance.comments) /
              content.performance.impressions) *
            100
          : 0;
      if (engagementRate > 5) priority += 20;
      if (engagementRate > 10) priority += 10;
    }

    // Boost certain conversions
    if (contentType === "presentation" && format.format === "twitter_thread") {
      priority += 15; // Presentations make great threads
    }
    if (contentType === "document" && format.format === "video_script") {
      priority += 10; // Long content works well as video
    }

    // Generate reason using AI
    const reason = await generateRepurposeReason(content, format);

    const suggestion = await prisma.repurposeSuggestion.create({
      data: {
        contentId,
        targetFormat: format.format,
        reason,
        priority: Math.min(100, priority),
      },
    });

    suggestions.push({
      ...suggestion,
      formatName: format.name,
      platforms: format.platforms,
    });
  }

  return { suggestions, created: suggestions.length };
}

async function generateRepurposeReason(
  content: { title?: string | null; text?: string | null; contentType?: string | null },
  format: RepurposeFormat
): Promise<string> {
  const contentPreview = content.title || content.text?.substring(0, 100) || "content";
  const prompt = `Given this ${content.contentType || "content"} about "${contentPreview}...", 
  explain in one sentence why it would work well as a ${format.name}.
  Keep it practical and specific to the content.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content[0];
    if (textBlock.type === "text") {
      return textBlock.text;
    }
    return `Great content for ${format.name} format`;
  } catch {
    return `Great content for ${format.name} format`;
  }
}

/**
 * Repurpose content into a new format
 */
export async function repurposeContent(
  contentId: string,
  targetFormat: string,
  options: {
    platform?: string;
    customInstructions?: string;
  } = {}
): Promise<{ id: string; title: string | null; text: string; contentType: string | null; platform: string; status: string }> {
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
  });

  if (!content) {
    throw new Error("Content not found");
  }

  const format = REPURPOSE_FORMATS.find((f) => f.format === targetFormat);
  if (!format) {
    throw new Error(`Unknown format: ${targetFormat}`);
  }

  // Generate repurposed content using AI
  const repurposedContent = await generateRepurposedContent(
    content,
    format,
    options
  );

  // Create new content record
  const newContent = await prisma.generatedContent.create({
    data: {
      title: repurposedContent.title,
      text: repurposedContent.content,
      contentType: targetFormat,
      platform: options.platform || format.platforms[0],
      status: "draft",
      parentContentId: contentId,
      repurposedFrom: content.contentType,
    },
  });

  // Mark suggestion as completed if exists
  await prisma.repurposeSuggestion.updateMany({
    where: {
      contentId,
      targetFormat,
      status: "pending",
    },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  return newContent;
}

async function generateRepurposedContent(
  originalContent: { title?: string | null; text?: string | null; contentType?: string | null },
  format: RepurposeFormat,
  options: { customInstructions?: string }
): Promise<{ title: string; content: string }> {
  const formatInstructions: Record<string, string> = {
    twitter_thread: `Convert this into a Twitter thread with 5-8 tweets.
Format each tweet on its own line starting with the tweet number.
First tweet should hook the reader.
Last tweet should have a call to action.
Each tweet must be under 280 characters.
Use the Let's Truck voice: direct, practical, no-BS.
Never use "trucker" - say "driver" or "professional driver".`,

    carousel: `Convert this into a 7-10 slide carousel.
Format as:
SLIDE 1: [Hook/Title]
SLIDE 2: [Point 1]
...
FINAL SLIDE: [Call to Action]
Each slide should be concise - max 2 sentences.
Make it visually scannable.`,

    video_script: `Convert this into a 60-90 second video script.
Format:
HOOK (0-5s): [Attention grabber]
PROBLEM (5-15s): [The issue drivers face]
SOLUTION (15-50s): [The main content]
CTA (50-60s): [What to do next]
Include visual suggestions in [brackets].
Write in conversational, spoken style.`,

    blog_post: `Expand this into a full blog post (800-1200 words).
Include:
- Engaging introduction
- 3-5 main sections with headers
- Practical examples
- Conclusion with next steps
Write for drivers, be practical and actionable.`,

    email_newsletter: `Convert this into an email newsletter segment.
Format:
SUBJECT LINE: [Compelling subject]
PREVIEW TEXT: [First line preview]
BODY: [2-3 paragraphs, conversational]
CTA: [Clear call to action]
Keep it scannable with short paragraphs.`,

    quick_tips: `Extract 5 standalone tip posts from this content.
Format each as:
TIP 1:
[Tip title]
[2-3 sentence explanation]

Each tip should work as an independent post.
Make them immediately actionable.`,

    infographic_brief: `Create an infographic brief with:
TITLE: [Main headline]
KEY STATS: [3-5 numbers or facts]
MAIN POINTS: [4-6 bullet points]
VISUAL SUGGESTIONS: [What images/icons to use]
FOOTER: [Call to action]`,
  };

  const systemPrompt = `You are repurposing content for Let's Truck, a health coaching brand for professional drivers.

Voice guidelines:
- Direct, practical, no-BS
- Never say "trucker" - use "driver" or "professional driver"
- Focus on actionable advice
- Speak to their reality (long hours, limited options, stress)

${options.customInstructions || ""}`;

  const userPrompt = `Original ${originalContent.contentType || "content"}:
---
${originalContent.title ? `Title: ${originalContent.title}` : ""}
${originalContent.text || ""}
---

${formatInstructions[format.format] || "Convert this content to a new format."}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content[0];
  const generatedText = textBlock.type === "text" ? textBlock.text : "";

  // Extract title if present
  let title = `${originalContent.title || "Untitled"} (${format.name})`;
  const content = generatedText;

  // Try to extract title from generated content
  const titleMatch = generatedText.match(
    /^(?:TITLE|SUBJECT LINE|TIP 1):\s*(.+?)[\n\r]/i
  );
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  return { title, content };
}

/**
 * Get pending suggestions for a user
 */
export async function getPendingSuggestions(limit: number = 10): Promise<Array<{
  id: string;
  contentId: string;
  targetFormat: string;
  reason: string;
  priority: number;
  status: string;
  content: {
    id: string;
    title: string | null;
    text: string;
    contentType: string | null;
    platform: string;
  };
  formatInfo: RepurposeFormat | undefined;
}>> {
  const suggestions = await prisma.repurposeSuggestion.findMany({
    where: { status: "pending" },
    orderBy: { priority: "desc" },
    take: limit,
    include: {
      content: {
        select: {
          id: true,
          title: true,
          text: true,
          contentType: true,
          platform: true,
        },
      },
    },
  });

  return suggestions.map((s) => ({
    ...s,
    formatInfo: REPURPOSE_FORMATS.find((f) => f.format === s.targetFormat),
  }));
}

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(suggestionId: string): Promise<void> {
  await prisma.repurposeSuggestion.update({
    where: { id: suggestionId },
    data: { status: "dismissed" },
  });
}

/**
 * Get content lineage (parent and derived content)
 */
export async function getContentLineage(contentId: string): Promise<{
  content: {
    id: string;
    title: string | null;
    contentType: string | null;
  } | null;
  parent: { id: string; title: string | null; contentType: string | null } | null;
  derived: Array<{ id: string; title: string | null; contentType: string | null; platform: string; status: string; createdAt: Date }>;
  totalDerived: number;
}> {
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      title: true,
      contentType: true,
      parentContent: {
        select: {
          id: true,
          title: true,
          contentType: true,
        },
      },
      derivedContent: {
        select: {
          id: true,
          title: true,
          contentType: true,
          platform: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  return {
    content: content ? { id: content.id, title: content.title, contentType: content.contentType } : null,
    parent: content?.parentContent || null,
    derived: content?.derivedContent || [],
    totalDerived: content?.derivedContent?.length || 0,
  };
}

export { REPURPOSE_FORMATS };

