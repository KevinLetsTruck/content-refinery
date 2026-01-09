import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { postTweet, uploadMedia as uploadTwitterMedia, isConfigured as isTwitterConfigured } from "@/lib/social/twitter";
import { postToFacebook, postToInstagram, isConfigured as isMetaConfigured } from "@/lib/social/meta";
import { trackPublish } from "@/lib/analytics/track-performance";
import { parseAndValidate, notFound, badRequest, notImplemented } from "@/lib/utils/api";
import { PLATFORM_CHAR_LIMITS } from "@/lib/constants";

// ============================================
// SHARED CONTENT FORMATTING UTILITIES
// ============================================

interface ContentInput {
  text: string;
  hashtags: string[];
  mediaUrl?: string | null;
}

/**
 * Format hashtags with # prefix if missing
 */
function formatHashtags(hashtags: string[], limit?: number): string {
  const tags = limit ? hashtags.slice(0, limit) : hashtags;
  return tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
}

/**
 * Build content text with hashtags appended
 */
function buildContentWithHashtags(
  text: string,
  hashtags: string[],
  charLimit: number,
  maxHashtags?: number
): string {
  if (!hashtags || hashtags.length === 0) {
    return truncateWithEllipsis(text, charLimit);
  }

  const hashtagString = formatHashtags(hashtags, maxHashtags);

  // Check if hashtags fit within limit
  if (text.length + hashtagString.length + 2 <= charLimit) {
    return `${text}\n\n${hashtagString}`;
  }

  // If not, just return truncated text
  return truncateWithEllipsis(text, charLimit);
}

/**
 * Truncate text with ellipsis if over limit
 */
function truncateWithEllipsis(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.substring(0, limit - 3) + "...";
}

// Request validation schema
const PublishRequestSchema = z.object({
  contentId: z.string().min(1, "contentId is required"),
  immediate: z.boolean().default(false),
});

/**
 * POST /api/publish
 *
 * Publish approved content to social platforms
 *
 * Body:
 * - contentId: ID of the GeneratedContent to publish
 * - immediate: boolean - publish now vs use scheduled time
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const { data, error } = await parseAndValidate(request, PublishRequestSchema);
    if (error || !data) return error ?? badRequest("Invalid request");

    const { contentId, immediate } = data;

    // Get the content
    const content = await prisma.generatedContent.findUnique({
      where: { id: contentId },
      include: {
        extraction: {
          include: {
            source: true
          }
        }
      }
    });

    if (!content) {
      return notFound("Content");
    }

    // Check if already published
    if (content.status === "published") {
      return badRequest("Content already published");
    }

    // Check if approved
    if (content.status !== "approved" && content.status !== "scheduled") {
      return badRequest(`Content must be approved before publishing. Current status: ${content.status}`);
    }

    // Check scheduled time
    if (!immediate && content.scheduledFor && new Date(content.scheduledFor) > new Date()) {
      return badRequest("Content is scheduled for a future time. Use immediate=true to publish now.");
    }

    // Route to appropriate platform
    let result: { id: string; url: string };

    switch (content.platform) {
      case "twitter":
        result = await publishToTwitter(content);
        break;

      case "instagram":
        result = await publishToInstagram(content);
        break;

      case "facebook":
        result = await publishToFacebookPage(content);
        break;

      case "linkedin":
        return notImplemented("LinkedIn publishing");

      case "tiktok":
        return notImplemented("TikTok publishing");

      default:
        return badRequest(`Unknown platform: ${content.platform}`);
    }

    // Update content with publish info
    const publishedAt = new Date();
    await prisma.generatedContent.update({
      where: { id: contentId },
      data: {
        status: "published",
        publishedAt,
        platformPostId: result.id,
        platformPostUrl: result.url,
      }
    });

    // Mark extraction as used
    if (content.extractionId) {
      await prisma.extraction.update({
        where: { id: content.extractionId },
        data: { isUsed: true }
      });
    }

    // Track performance for analytics
    try {
      const metadata = content.metadata as Record<string, unknown> || {};
      await trackPublish({
        generatedContentId: content.id,
        platform: content.platform,
        publishedAt,
        formula: metadata.formula as string | undefined,
        hookType: metadata.hookType as string | undefined,
        pillar: metadata.pillar as string | undefined,
        objective: metadata.objective as string | undefined,
        contentType: content.extraction?.type,
      });
    } catch (trackError) {
      // Don't fail the publish if tracking fails
      console.error("[Publish] Failed to track performance:", trackError);
    }

    return NextResponse.json({
      success: true,
      contentId,
      platform: content.platform,
      postId: result.id,
      postUrl: result.url,
      publishedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[Publish] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publishing failed" },
      { status: 500 }
    );
  }
}

/**
 * Publish to Twitter
 */
async function publishToTwitter(content: ContentInput): Promise<{ id: string; url: string }> {
  if (!isTwitterConfigured()) {
    throw new Error("Twitter credentials not configured");
  }

  // Build tweet with hashtags using shared utility
  const tweetText = buildContentWithHashtags(
    content.text,
    content.hashtags,
    PLATFORM_CHAR_LIMITS.twitter
  );

  // Upload media if present
  let mediaIds: string[] | undefined;
  if (content.mediaUrl) {
    try {
      const mediaId = await uploadTwitterMedia(content.mediaUrl);
      mediaIds = [mediaId];
    } catch (error) {
      console.error("[Publish] Twitter media upload failed:", error);
      // Continue without media
    }
  }

  const result = await postTweet({ text: tweetText, mediaIds });
  return { id: result.id, url: result.url };
}

/**
 * Publish to Instagram
 */
async function publishToInstagram(content: ContentInput): Promise<{ id: string; url: string }> {
  const metaConfig = isMetaConfigured();

  if (!metaConfig.instagram) {
    throw new Error("Instagram credentials not configured. Set META_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID");
  }

  // Instagram requires an image
  if (!content.mediaUrl) {
    throw new Error("Instagram posts require an image. Generate a visual first.");
  }

  // Build caption with hashtags using shared utility (max 30 hashtags on Instagram)
  const caption = buildContentWithHashtags(
    content.text,
    content.hashtags,
    PLATFORM_CHAR_LIMITS.instagram,
    30
  );

  const result = await postToInstagram({ caption, imageUrl: content.mediaUrl });
  return { id: result.id, url: result.url };
}

/**
 * Publish to Facebook Page
 */
async function publishToFacebookPage(content: ContentInput): Promise<{ id: string; url: string }> {
  const metaConfig = isMetaConfigured();

  if (!metaConfig.facebook) {
    throw new Error("Facebook credentials not configured. Set META_ACCESS_TOKEN and FACEBOOK_PAGE_ID");
  }

  // Build message with hashtags using shared utility (Facebook best practice: max 5 hashtags)
  const message = buildContentWithHashtags(
    content.text,
    content.hashtags,
    PLATFORM_CHAR_LIMITS.facebook,
    5
  );

  const result = await postToFacebook({ message, imageUrl: content.mediaUrl || undefined });
  return { id: result.id, url: result.url };
}

/**
 * GET /api/publish/status
 * 
 * Check publishing capabilities
 */
export async function GET() {
  const metaConfig = isMetaConfigured();
  
  const platforms = {
    twitter: {
      configured: isTwitterConfigured(),
      name: "Twitter/X",
    },
    instagram: {
      configured: metaConfig.instagram,
      name: "Instagram",
      requiresImage: true,
    },
    facebook: {
      configured: metaConfig.facebook,
      name: "Facebook",
    },
    linkedin: {
      configured: false,
      name: "LinkedIn",
    },
    tiktok: {
      configured: false,
      name: "TikTok",
    },
  };

  return NextResponse.json({ platforms });
}
