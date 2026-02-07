import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { postTweet, uploadMedia as uploadTwitterMedia, isConfigured as isTwitterConfigured } from "@/lib/social/twitter";
import { postToFacebook, postToInstagram, isConfigured as isMetaConfigured } from "@/lib/social/meta";
import { uploadVideo as uploadYouTubeVideo, isConfigured as isYouTubeConfigured } from "@/lib/social/youtube";
import { postToLinkedIn, postWithImage as postLinkedInWithImage, isConfigured as isLinkedInConfigured } from "@/lib/social/linkedin";
import { uploadVideo as uploadTikTokVideo, isConfigured as isTikTokConfigured } from "@/lib/social/tiktok";
import { publishToMightyNetworks as postToMightyNetworks, adaptForTribe, isConfigured as isMightyNetworksConfigured } from "@/lib/social/mighty-networks";
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
    let result: { id: string; url: string; scheduledTime?: Date; isScheduled?: boolean };

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

      case "youtube":
      case "youtube_shorts":
        result = await publishToYouTube({
          text: content.text,
          hashtags: content.hashtags,
          title: content.title || undefined,
          videoUrl: content.mediaUrl, // mediaUrl can be video or image
        }, content.platform === "youtube_shorts");
        break;

      case "linkedin":
        result = await publishToLinkedInPlatform(content);
        break;

      case "tiktok":
        result = await publishToTikTok({
          text: content.text,
          hashtags: content.hashtags,
          title: content.title || undefined,
          videoUrl: content.mediaUrl,
        });
        break;

      case "mighty_networks":
        result = await publishToMightyNetworksPlatform(content);
        break;

      default:
        return badRequest(`Unknown platform: ${content.platform}`);
    }

    // For Facebook with native scheduling, the post goes live after scheduledTime
    const publishedAt = result.isScheduled ? result.scheduledTime! : new Date();

    // Update content with publish info
    await prisma.generatedContent.update({
      where: { id: contentId },
      data: {
        status: result.isScheduled ? "scheduled" : "published",
        publishedAt: result.isScheduled ? null : publishedAt,
        scheduledFor: result.isScheduled ? result.scheduledTime : null,
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
      // For Facebook, posts are natively scheduled to avoid "Published by" attribution
      isScheduled: result.isScheduled || false,
      scheduledFor: result.isScheduled ? result.scheduledTime?.toISOString() : undefined,
      publishedAt: result.isScheduled ? undefined : new Date().toISOString(),
      // Inform the user about native scheduling
      message: result.isScheduled
        ? `Post scheduled via Facebook's native scheduler (goes live at ${result.scheduledTime?.toLocaleTimeString()}). This avoids the "Published by" attribution penalty.`
        : undefined,
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
 *
 * By default, uses native scheduling (10 min delay) to avoid "Published by [App]" attribution.
 * This makes posts appear as native Facebook posts with better algorithmic reach.
 */
async function publishToFacebookPage(content: ContentInput): Promise<{
  id: string;
  url: string;
  scheduledTime?: Date;
  isScheduled?: boolean;
}> {
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

  // Use native scheduling by default to avoid third-party attribution penalty
  // Posts will go live ~10 minutes after this call
  const result = await postToFacebook({
    message,
    imageUrl: content.mediaUrl || undefined,
    useNativeScheduling: true, // This avoids "Published by Content Refinery"
  });

  return {
    id: result.id,
    url: result.url,
    scheduledTime: result.scheduledTime,
    isScheduled: result.isScheduled,
  };
}

/**
 * Publish to YouTube / YouTube Shorts
 */
interface YouTubeContentInput extends ContentInput {
  title?: string;
  videoUrl?: string | null;
}

async function publishToYouTube(
  content: YouTubeContentInput,
  isShort: boolean = false
): Promise<{ id: string; url: string }> {
  if (!isYouTubeConfigured()) {
    throw new Error(
      "YouTube credentials not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN"
    );
  }

  // YouTube requires a video
  if (!content.videoUrl) {
    throw new Error("YouTube publishing requires a video URL");
  }

  // Download the video from the URL (could be R2 or temporary Veo URL)
  const videoResponse = await fetch(content.videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video from ${content.videoUrl}`);
  }
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  // Build title (use content title or first 100 chars of text)
  const title = content.title || content.text.substring(0, 100);

  // Build description with hashtags
  const hashtagString = content.hashtags.length > 0
    ? "\n\n" + content.hashtags.map(t => t.startsWith("#") ? t : `#${t}`).join(" ")
    : "";
  const description = content.text + hashtagString;

  // Upload to YouTube
  const result = await uploadYouTubeVideo({
    title,
    description,
    tags: content.hashtags,
    videoBuffer,
    isShort,
    privacyStatus: "public",
  });

  return { id: result.id, url: result.url };
}

/**
 * Publish to LinkedIn
 */
async function publishToLinkedInPlatform(content: ContentInput): Promise<{ id: string; url: string }> {
  if (!isLinkedInConfigured()) {
    throw new Error(
      "LinkedIn credentials not configured. Set LINKEDIN_ACCESS_TOKEN"
    );
  }

  // Build post text with hashtags using shared utility (LinkedIn best practice: max 5 hashtags)
  const postText = buildContentWithHashtags(
    content.text,
    content.hashtags,
    PLATFORM_CHAR_LIMITS.linkedin,
    5
  );

  // Use image upload if media is present
  if (content.mediaUrl) {
    const result = await postLinkedInWithImage({
      text: postText,
      imageUrl: content.mediaUrl,
    });
    return { id: result.id, url: result.url };
  }

  // Text-only post
  const result = await postToLinkedIn({ text: postText });
  return { id: result.id, url: result.url };
}

/**
 * Publish to TikTok
 */
interface TikTokContentInput extends ContentInput {
  title?: string;
  videoUrl?: string | null;
}

async function publishToTikTok(
  content: TikTokContentInput
): Promise<{ id: string; url: string }> {
  if (!isTikTokConfigured()) {
    throw new Error(
      "TikTok credentials not configured. Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, and TIKTOK_ACCESS_TOKEN"
    );
  }

  // TikTok requires a video
  if (!content.videoUrl) {
    throw new Error("TikTok publishing requires a video URL");
  }

  // Download the video from the URL
  const videoResponse = await fetch(content.videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video from ${content.videoUrl}`);
  }
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  // Build title (use content title or first 100 chars of text)
  const title = content.title || content.text.substring(0, 100);

  // Build caption with hashtags (TikTok: max 2200 chars, unlimited hashtags)
  const caption = buildContentWithHashtags(
    content.text,
    content.hashtags,
    PLATFORM_CHAR_LIMITS.tiktok
  );

  // Upload to TikTok
  const result = await uploadTikTokVideo({
    title,
    caption,
    videoBuffer,
    privacyLevel: "PUBLIC_TO_EVERYONE",
  });

  return { id: result.id, url: result.url };
}

/**
 * Publish to Mighty Networks (Let's Truck Tribe)
 */
async function publishToMightyNetworksPlatform(content: ContentInput): Promise<{ id: string; url: string }> {
  if (!isMightyNetworksConfigured()) {
    throw new Error(
      "Mighty Networks credentials not configured. Set MIGHTY_NETWORKS_API_TOKEN and MIGHTY_NETWORKS_SPACE_ID"
    );
  }

  // Adapt social content into a community-tailored Tribe post (no hashtags in MN)
  const baseText = truncateWithEllipsis(content.text, PLATFORM_CHAR_LIMITS.mighty_networks);
  const communityText = await adaptForTribe(baseText);

  const result = await postToMightyNetworks({
    text: communityText,
    imageUrl: content.mediaUrl,
  });

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
    youtube: {
      configured: isYouTubeConfigured(),
      name: "YouTube",
      requiresVideo: true,
    },
    youtube_shorts: {
      configured: isYouTubeConfigured(),
      name: "YouTube Shorts",
      requiresVideo: true,
      maxDuration: 60,
    },
    linkedin: {
      configured: isLinkedInConfigured(),
      name: "LinkedIn",
    },
    tiktok: {
      configured: isTikTokConfigured(),
      name: "TikTok",
      requiresVideo: true,
      maxDuration: 180, // 3 minutes for regular, 60 for stories
    },
    mighty_networks: {
      configured: isMightyNetworksConfigured(),
      name: "Let's Truck Tribe",
    },
  };

  return NextResponse.json({ platforms });
}
