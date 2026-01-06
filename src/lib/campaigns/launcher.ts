import prisma from "@/lib/db/prisma";
import { scheduleCampaign } from "./smart-scheduler";
import { generateAndStoreImage, createImagePrompt } from "@/lib/images/dalle";

interface LaunchResult {
  success: boolean;
  message: string;
  postsScheduled?: number;
  videosQueued?: number;
}

/**
 * Launch a campaign - schedule posts and start auto-publishing
 */
export async function launchCampaign(campaignId: string): Promise<LaunchResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      posts: true,
      videos: true,
    },
  });

  if (!campaign) {
    return { success: false, message: "Campaign not found" };
  }

  // Validate campaign status
  if (!["review", "approved"].includes(campaign.status)) {
    return {
      success: false,
      message: `Campaign must be in 'review' or 'approved' status. Current: ${campaign.status}`,
    };
  }

  // Validate start date is in the future (or today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (campaign.startDate < today) {
    return {
      success: false,
      message: "Campaign start date must be today or in the future",
    };
  }

  // Schedule if not already scheduled
  if (campaign.status === "review") {
    await scheduleCampaign(campaignId);
  }

  // Generate visuals in background
  generateCampaignVisuals(campaignId).catch((error) => {
    console.error(`[Campaign] Visual generation failed for ${campaignId}:`, error);
  });

  // Update campaign status to active
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "active",
      launchedAt: new Date(),
    },
  });

  return {
    success: true,
    message: "Campaign launched successfully",
    postsScheduled: campaign.posts.length,
    videosQueued: campaign.videos.length,
  };
}

/**
 * Generate visuals for all campaign posts using DALL-E
 */
async function generateCampaignVisuals(campaignId: string): Promise<void> {
  const posts = await prisma.campaignPost.findMany({
    where: {
      campaignId,
      visualType: { not: "none" },
      visualStatus: "pending",
      visualPrompt: { not: null },
    },
  });

  console.log(`[Campaign] Generating visuals for ${posts.length} posts`);

  for (const post of posts) {
    try {
      await prisma.campaignPost.update({
        where: { id: post.id },
        data: { visualStatus: "generating" },
      });

      // Use DALL-E for visual generation
      const prompt = post.visualPrompt || createImagePrompt(post.content, "social", post.platform);
      const visualUrl = await generateAndStoreImage(prompt, post.platform);

      await prisma.campaignPost.update({
        where: { id: post.id },
        data: {
          visualUrl,
          visualStatus: "ready",
        },
      });

      console.log(`[Campaign] Visual generated for post ${post.id}`);
    } catch (error) {
      console.error(`[Campaign] Visual failed for post ${post.id}:`, error);
      
      await prisma.campaignPost.update({
        where: { id: post.id },
        data: { visualStatus: "error" },
      });
    }

    // Rate limit for API calls (DALL-E has rate limits)
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

/**
 * Pause a running campaign
 */
export async function pauseCampaign(campaignId: string): Promise<{ success: boolean }> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "paused" },
  });

  return { success: true };
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(campaignId: string): Promise<{ success: boolean }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign || campaign.status !== "paused") {
    return { success: false };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "active" },
  });

  return { success: true };
}

/**
 * Get campaign status summary
 */
export async function getCampaignStatus(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  if (!campaign) return null;

  const postStats = await prisma.campaignPost.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  });

  const videoStats = await prisma.campaignVideo.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  });

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      launchedAt: campaign.launchedAt,
    },
    posts: {
      total: campaign.totalPosts,
      published: campaign.publishedPosts,
      byStatus: Object.fromEntries(
        postStats.map((s) => [s.status, s._count])
      ),
    },
    videos: {
      total: campaign.totalVideos,
      published: campaign.publishedVideos,
      byStatus: Object.fromEntries(
        videoStats.map((s) => [s.status, s._count])
      ),
    },
    performance: {
      impressions: campaign.totalImpressions,
      engagements: campaign.totalEngagements,
      clicks: campaign.totalClicks,
      engagementRate: campaign.engagementRate,
    },
  };
}




