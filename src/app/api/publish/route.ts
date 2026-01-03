import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { postTweet, uploadMedia as uploadTwitterMedia, isConfigured as isTwitterConfigured } from "@/lib/social/twitter";
import { postToFacebook, postToInstagram, isConfigured as isMetaConfigured } from "@/lib/social/meta";

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
    const body = await request.json();
    const { contentId, immediate = false } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId is required" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Check if already published
    if (content.status === "published") {
      return NextResponse.json(
        { error: "Content already published", platformPostUrl: content.platformPostUrl },
        { status: 400 }
      );
    }

    // Check if approved
    if (content.status !== "approved" && content.status !== "scheduled") {
      return NextResponse.json(
        { error: `Content must be approved before publishing. Current status: ${content.status}` },
        { status: 400 }
      );
    }

    // Check scheduled time
    if (!immediate && content.scheduledFor && new Date(content.scheduledFor) > new Date()) {
      return NextResponse.json(
        { error: "Content is scheduled for a future time. Use immediate=true to publish now." },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: "LinkedIn publishing not yet implemented" },
          { status: 501 }
        );
      
      case "tiktok":
        return NextResponse.json(
          { error: "TikTok publishing not yet implemented" },
          { status: 501 }
        );
      
      default:
        return NextResponse.json(
          { error: `Unknown platform: ${content.platform}` },
          { status: 400 }
        );
    }

    // Update content with publish info
    await prisma.generatedContent.update({
      where: { id: contentId },
      data: {
        status: "published",
        publishedAt: new Date(),
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
async function publishToTwitter(content: {
  text: string;
  hashtags: string[];
  mediaUrl?: string | null;
}): Promise<{ id: string; url: string }> {
  if (!isTwitterConfigured()) {
    throw new Error("Twitter credentials not configured");
  }

  // Build tweet text with hashtags
  let tweetText = content.text;
  
  // Add hashtags if there's room (280 char limit)
  if (content.hashtags && content.hashtags.length > 0) {
    const hashtagString = content.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(" ");
    if (tweetText.length + hashtagString.length + 2 <= 280) {
      tweetText = `${tweetText}\n\n${hashtagString}`;
    }
  }

  // Truncate if needed
  if (tweetText.length > 280) {
    tweetText = tweetText.substring(0, 277) + "...";
  }

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

  const result = await postTweet({
    text: tweetText,
    mediaIds,
  });

  return {
    id: result.id,
    url: result.url,
  };
}

/**
 * Publish to Instagram
 */
async function publishToInstagram(content: {
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

  // Build caption with hashtags (Instagram allows 2200 chars, 30 hashtags)
  let caption = content.text;
  
  if (content.hashtags && content.hashtags.length > 0) {
    const hashtagString = content.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(" ");
    caption = `${caption}\n\n${hashtagString}`;
  }

  // Truncate if needed
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

/**
 * Publish to Facebook Page
 */
async function publishToFacebookPage(content: {
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
    // Facebook best practice: fewer hashtags than Instagram
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
