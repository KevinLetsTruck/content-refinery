import prisma from "@/lib/db/prisma";
import { postTweet, uploadMedia } from "@/lib/social/twitter";
import { postToFacebook, postToInstagram } from "@/lib/social/meta";
import { postToLinkedIn, postWithImage as postLinkedInWithImage } from "@/lib/social/linkedin";
import { uploadVideo as uploadTikTokVideo } from "@/lib/social/tiktok";
import { formatForTwitter } from "@/lib/utils/text";
import { isDirectImageUrl, isVideoUrl } from "@/lib/utils/url";

interface PublishResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

/**
 * Publish a single campaign post to its platform
 */
export async function publishCampaignPost(
  postId: string
): Promise<PublishResult> {
  const post = await prisma.campaignPost.findUnique({
    where: { id: postId },
    include: { campaign: true },
  });

  if (!post) {
    return { success: false, error: "Post not found" };
  }

  try {
    let result: PublishResult;

    switch (post.platform) {
      case "twitter":
        result = await publishToTwitterWithFallback(post.content, post.hashtags, post.visualUrl);
        break;

      case "facebook":
        result = await publishToFacebookWithFallback(post.content, post.hashtags, post.visualUrl);
        break;

      case "instagram":
        result = await publishToInstagramWithFallback(post.content, post.hashtags, post.visualUrl);
        break;

      case "linkedin":
        result = await publishToLinkedInWithFallback(post.content, post.hashtags, post.visualUrl);
        break;

      case "tiktok":
        result = await publishToTikTokWithFallback(post.content, post.hashtags, post.visualUrl);
        break;

      default:
        return { success: false, error: `Unknown platform: ${post.platform}` };
    }

    if (result.success) {
      // Update post as published
      await prisma.campaignPost.update({
        where: { id: postId },
        data: {
          status: "published",
          platformPostId: result.postId,
          publishedUrl: result.url,
          publishedAt: new Date(),
        },
      });

      // Increment campaign published count
      await prisma.campaign.update({
        where: { id: post.campaignId },
        data: {
          publishedPosts: { increment: 1 },
        },
      });

      console.log(`[Publish] Campaign post ${postId} published to ${post.platform}: ${result.url}`);
    } else {
      // Mark as failed
      await prisma.campaignPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: result.error,
        },
      });

      console.error(`[Publish] Campaign post ${postId} failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await prisma.campaignPost.update({
      where: { id: postId },
      data: {
        status: "failed",
        error: errorMessage,
      },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Twitter publish with image fallback
 */
async function publishToTwitterWithFallback(
  content: string,
  hashtags: string[],
  imageUrl?: string | null
): Promise<PublishResult> {
  try {
    // Format text with hashtags and truncate for Twitter
    const tweetText = formatForTwitter(content, hashtags);

    let mediaIds: string[] | undefined;

    // Try with image first if it's a direct image URL
    if (imageUrl && isDirectImageUrl(imageUrl)) {
      try {
        const mediaId = await uploadMedia(imageUrl);
        mediaIds = [mediaId];
      } catch (imageError) {
        console.warn("[Publish] Twitter image upload failed, trying text-only:", imageError);
      }
    }

    // Publish tweet
    const result = await postTweet({
      text: tweetText,
      mediaIds,
    });

    return {
      success: true,
      postId: result.id,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Twitter publish failed",
    };
  }
}

/**
 * Facebook publish with image fallback
 *
 * Uses native scheduling by default to avoid "Published by [App]" attribution,
 * which Facebook's algorithm penalizes with reduced reach.
 */
async function publishToFacebookWithFallback(
  content: string,
  hashtags: string[],
  imageUrl?: string | null
): Promise<PublishResult> {
  // Build content with hashtags
  const hashtagStr = hashtags.map((tag) => `#${tag}`).join(" ");
  const fullContent = hashtags.length > 0 ? `${content}\n\n${hashtagStr}` : content;

  try {
    const result = await postToFacebook({
      message: fullContent,
      imageUrl: imageUrl || undefined,
      // Use native scheduling to avoid third-party attribution penalty
      useNativeScheduling: true,
    });

    if (result.isScheduled) {
      console.log(`[Publish] Facebook post scheduled for ${result.scheduledTime?.toISOString()} (avoids "Published by" attribution)`);
    }

    return {
      success: true,
      postId: result.id,
      url: result.url || `https://facebook.com/${result.id}`,
    };
  } catch (error) {
    // Try without image
    if (imageUrl) {
      try {
        const result = await postToFacebook({
          message: fullContent,
          useNativeScheduling: true,
        });
        return {
          success: true,
          postId: result.id,
          url: result.url || `https://facebook.com/${result.id}`,
        };
      } catch (retryError) {
        return {
          success: false,
          error: retryError instanceof Error ? retryError.message : "Facebook publish failed",
        };
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Facebook publish failed",
    };
  }
}

/**
 * Instagram publish with image requirement handling
 */
async function publishToInstagramWithFallback(
  content: string,
  hashtags: string[],
  imageUrl?: string | null
): Promise<PublishResult> {
  // Instagram requires an image
  if (!imageUrl) {
    return {
      success: false,
      error: "Instagram requires an image - no image URL provided",
    };
  }

  // Build content with hashtags (Instagram likes lots of hashtags)
  const hashtagStr = hashtags.map((tag) => `#${tag}`).join(" ");
  const fullContent = hashtags.length > 0 ? `${content}\n\n${hashtagStr}` : content;

  try {
    const result = await postToInstagram({
      caption: fullContent,
      imageUrl,
    });
    
    return {
      success: true,
      postId: result.id,
      url: result.url || `https://instagram.com/p/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Instagram publish failed",
    };
  }
}

/**
 * LinkedIn publish with image fallback
 */
async function publishToLinkedInWithFallback(
  content: string,
  hashtags: string[],
  imageUrl?: string | null
): Promise<PublishResult> {
  // Build content with hashtags (LinkedIn best practice: max 5 hashtags)
  const hashtagStr = hashtags.slice(0, 5).map((tag) => `#${tag}`).join(" ");
  const fullContent = hashtags.length > 0 ? `${content}\n\n${hashtagStr}` : content;

  try {
    // Try with image if it's a direct image URL
    if (imageUrl && isDirectImageUrl(imageUrl)) {
      try {
        const result = await postLinkedInWithImage({
          text: fullContent,
          imageUrl,
        });
        return {
          success: true,
          postId: result.id,
          url: result.url,
        };
      } catch (imageError) {
        console.warn("[Publish] LinkedIn image upload failed, trying text-only:", imageError);
      }
    }

    // Text-only post
    const result = await postToLinkedIn({ text: fullContent });
    return {
      success: true,
      postId: result.id,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "LinkedIn publish failed",
    };
  }
}

/**
 * TikTok publish (requires video)
 */
async function publishToTikTokWithFallback(
  content: string,
  hashtags: string[],
  videoUrl?: string | null
): Promise<PublishResult> {
  // TikTok requires a video
  if (!videoUrl || !isVideoUrl(videoUrl)) {
    return {
      success: false,
      error: "TikTok requires a video - no video URL provided or invalid format",
    };
  }

  // Build caption with hashtags (TikTok loves hashtags)
  const hashtagStr = hashtags.map((tag) => `#${tag}`).join(" ");
  const caption = hashtags.length > 0 ? `${content}\n\n${hashtagStr}` : content;

  try {
    // Download the video first
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return {
        success: false,
        error: `Failed to download video from URL: ${videoResponse.statusText}`,
      };
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    const result = await uploadTikTokVideo({
      title: content.substring(0, 100),
      caption,
      videoBuffer,
      privacyLevel: "PUBLIC_TO_EVERYONE",
    });

    return {
      success: true,
      postId: result.id,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "TikTok publish failed",
    };
  }
}

/**
 * Get all posts that should be published now
 */
export async function getPostsDueForPublishing(): Promise<string[]> {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const posts = await prisma.campaignPost.findMany({
    where: {
      status: "scheduled",
      scheduledFor: {
        lte: fiveMinutesFromNow,
      },
      campaign: {
        status: "active",
      },
    },
    select: { id: true },
  });

  return posts.map((p) => p.id);
}

/**
 * Publish all due posts
 */
export async function publishDuePosts(): Promise<{
  published: number;
  failed: number;
  errors: string[];
}> {
  const postIds = await getPostsDueForPublishing();
  const results = { published: 0, failed: 0, errors: [] as string[] };

  for (const postId of postIds) {
    // Update status to publishing
    await prisma.campaignPost.update({
      where: { id: postId },
      data: { status: "publishing" },
    });

    const result = await publishCampaignPost(postId);

    if (result.success) {
      results.published++;
    } else {
      results.failed++;
      results.errors.push(`${postId}: ${result.error}`);
    }

    // Rate limit between posts
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Check if campaign is complete (all posts published)
 */
export async function checkCampaignCompletion(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: {
          posts: { where: { status: "published" } },
        },
      },
    },
  });

  if (!campaign) return;

  // Check if all posts are published
  if (campaign._count.posts >= campaign.totalPosts && campaign.status === "active") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    console.log(`[Campaign] Campaign ${campaignId} completed`);
  }
}




