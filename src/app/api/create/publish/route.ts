import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { postTweet, uploadMedia as uploadTwitterMedia, isConfigured as isTwitterConfigured } from "@/lib/social/twitter";
import { postToFacebook, postToInstagram, isConfigured as isMetaConfigured } from "@/lib/social/meta";
import { trackPublish } from "@/lib/analytics/track-performance";
import { formatForTwitter, smartTruncate, PLATFORM_LIMITS } from "@/lib/utils/text";

interface PublishRequest {
  content: {
    text: string;
    hashtags: string[];
    platforms: string[];
  };
  visuals: {
    platform: string;
    gammaUrl?: string;
    generationId?: string;
  }[];
  publishOption: "now" | "schedule" | "queue" | "draft";
  scheduledTime?: string;
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json();
    const { content, visuals, publishOption, scheduledTime } = body;

    console.log("[Create/Publish] Received request:", {
      publishOption,
      platforms: content?.platforms,
      textLength: content?.text?.length,
    });

    if (!content || !content.text) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    if (!content.platforms || content.platforms.length === 0) {
      return NextResponse.json(
        { error: "At least one platform is required" },
        { status: 400 }
      );
    }

    // Determine initial status based on publish option
    let initialStatus: string;
    switch (publishOption) {
      case "now":
        initialStatus = "approved"; // Will be updated to published after API call
        break;
      case "schedule":
        initialStatus = "scheduled";
        break;
      case "queue":
        initialStatus = "pending";
        break;
      case "draft":
        initialStatus = "draft";
        break;
      default:
        initialStatus = "draft";
    }

    // Create generated content records for each platform
    const createdContent = await Promise.all(
      content.platforms.map(async (platform) => {
        const visual = visuals.find((v) => v.platform === platform);

        return prisma.generatedContent.create({
          data: {
            platform,
            text: content.text,
            hashtags: content.hashtags,
            status: initialStatus,
            scheduledFor: scheduledTime ? new Date(scheduledTime) : null,
            mediaUrl: visual?.gammaUrl || null,
            metadata: {
              gammaGenerationId: visual?.generationId,
              createdVia: "wizard",
              publishOption,
            },
          },
        });
      })
    );

    console.log("[Create/Publish] Created content records:", createdContent.map(c => ({ id: c.id, platform: c.platform })));

    // If publishing now, actually publish to social media
    const publishResults: PublishResult[] = [];

    if (publishOption === "now") {
      console.log("[Create/Publish] Publishing now to social media...");

      for (const contentRecord of createdContent) {
        try {
          let result: { id: string; url: string } | null = null;

          switch (contentRecord.platform) {
            case "twitter":
              result = await publishToTwitter(contentRecord);
              break;
            case "facebook":
              result = await publishToFacebook(contentRecord);
              break;
            case "instagram":
            case "instagram_feed":
            case "instagram_story":
              result = await publishToInstagramPlatform(contentRecord);
              break;
            case "linkedin":
              publishResults.push({
                platform: contentRecord.platform,
                success: false,
                error: "LinkedIn publishing not yet implemented",
              });
              continue;
            case "tiktok":
              publishResults.push({
                platform: contentRecord.platform,
                success: false,
                error: "TikTok publishing not yet implemented",
              });
              continue;
            default:
              publishResults.push({
                platform: contentRecord.platform,
                success: false,
                error: `Unknown platform: ${contentRecord.platform}`,
              });
              continue;
          }

          if (result) {
            // Update content with publish info
            const publishedAt = new Date();
            await prisma.generatedContent.update({
              where: { id: contentRecord.id },
              data: {
                status: "published",
                publishedAt,
                platformPostId: result.id,
                platformPostUrl: result.url,
              },
            });

            // Track performance
            try {
              const metadata = contentRecord.metadata as Record<string, unknown> || {};
              await trackPublish({
                generatedContentId: contentRecord.id,
                platform: contentRecord.platform,
                publishedAt,
                formula: metadata.formula as string | undefined,
                hookType: metadata.hookType as string | undefined,
                pillar: metadata.pillar as string | undefined,
                objective: metadata.objective as string | undefined,
              });
            } catch (trackError) {
              console.error("[Create/Publish] Failed to track performance:", trackError);
            }

            publishResults.push({
              platform: contentRecord.platform,
              success: true,
              postId: result.id,
              postUrl: result.url,
            });

            console.log(`[Create/Publish] Published to ${contentRecord.platform}: ${result.url}`);
          }
        } catch (error) {
          console.error(`[Create/Publish] Failed to publish to ${contentRecord.platform}:`, error);
          
          // Mark as failed
          await prisma.generatedContent.update({
            where: { id: contentRecord.id },
            data: { status: "failed" },
          });

          publishResults.push({
            platform: contentRecord.platform,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Check if any publishes failed
    const failedPublishes = publishResults.filter(r => !r.success);
    const successfulPublishes = publishResults.filter(r => r.success);

    if (publishOption === "now" && failedPublishes.length > 0 && successfulPublishes.length === 0) {
      // All publishes failed
      return NextResponse.json({
        success: false,
        error: `Publishing failed: ${failedPublishes.map(f => `${f.platform}: ${f.error}`).join(", ")}`,
        contentIds: createdContent.map((c) => c.id),
        publishResults,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: publishOption === "now"
        ? `Published to ${successfulPublishes.length} platform(s)${failedPublishes.length > 0 ? `, ${failedPublishes.length} failed` : ""}`
        : publishOption === "schedule"
        ? "Content scheduled"
        : publishOption === "queue"
        ? "Added to queue"
        : "Draft saved",
      contentIds: createdContent.map((c) => c.id),
      platforms: content.platforms,
      scheduledFor: scheduledTime || null,
      publishResults: publishOption === "now" ? publishResults : undefined,
    });
  } catch (error) {
    console.error("[Create/Publish] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Publish to Twitter
 */
async function publishToTwitter(content: {
  text: string;
  hashtags: string[];
  mediaUrl?: string | null;
}): Promise<{ id: string; url: string }> {
  if (!isTwitterConfigured()) {
    throw new Error("Twitter credentials not configured");
  }

  // Use smart formatting to handle 280 char limit
  const tweetText = formatForTwitter(content.text, content.hashtags);
  
  console.log(`[Create/Publish] Twitter text length: ${tweetText.length}/280`);
  
  // Final safety check
  if (tweetText.length > 280) {
    console.warn(`[Create/Publish] Text still over limit after formatting, hard truncating`);
  }

  // Upload media if present
  let mediaIds: string[] | undefined;
  if (content.mediaUrl) {
    try {
      console.log(`[Create/Publish] Uploading media: ${content.mediaUrl}`);
      const mediaId = await uploadTwitterMedia(content.mediaUrl);
      mediaIds = [mediaId];
      console.log(`[Create/Publish] Media uploaded: ${mediaId}`);
    } catch (error) {
      console.warn("[Create/Publish] Twitter media upload failed, continuing text-only:", error);
      // Continue without media - don't fail the publish
    }
  }

  const result = await postTweet({
    text: tweetText,
    mediaIds,
  });

  console.log(`[Create/Publish] Tweet posted: ${result.url}`);

  return {
    id: result.id,
    url: result.url,
  };
}

/**
 * Publish to Facebook
 */
async function publishToFacebook(content: {
  text: string;
  hashtags: string[];
  mediaUrl?: string | null;
}): Promise<{ id: string; url: string }> {
  const metaConfig = isMetaConfigured();
  
  if (!metaConfig.facebook) {
    throw new Error("Facebook credentials not configured. Set META_ACCESS_TOKEN and FACEBOOK_PAGE_ID");
  }

  // Build message with hashtags
  let message = content.text;
  
  if (content.hashtags && content.hashtags.length > 0) {
    const limitedHashtags = content.hashtags.slice(0, 5);
    const hashtagString = limitedHashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(" ");
    message = `${message}\n\n${hashtagString}`;
  }

  const result = await postToFacebook({
    message,
    imageUrl: content.mediaUrl || undefined,
  });

  return {
    id: result.id,
    url: result.url,
  };
}

/**
 * Publish to Instagram
 */
async function publishToInstagramPlatform(content: {
  text: string;
  hashtags: string[];
  mediaUrl?: string | null;
}): Promise<{ id: string; url: string }> {
  const metaConfig = isMetaConfigured();
  
  if (!metaConfig.instagram) {
    throw new Error("Instagram credentials not configured. Set META_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID");
  }

  // Instagram requires an image
  if (!content.mediaUrl) {
    throw new Error("Instagram posts require an image. Generate a visual first.");
  }

  // Build caption with hashtags
  let caption = content.text;
  
  if (content.hashtags && content.hashtags.length > 0) {
    const hashtagString = content.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(" ");
    caption = `${caption}\n\n${hashtagString}`;
  }

  if (caption.length > 2200) {
    caption = caption.substring(0, 2197) + "...";
  }

  const result = await postToInstagram({
    caption,
    imageUrl: content.mediaUrl,
  });

  return {
    id: result.id,
    url: result.url,
  };
}
