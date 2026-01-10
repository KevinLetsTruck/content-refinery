import prisma from "@/lib/db/prisma";
import { generateCampaignStrategy } from "./strategy-generator";
import { CreateCampaignInput } from "./types";

/**
 * Create a new campaign and generate all content
 */
export async function createCampaign(input: CreateCampaignInput): Promise<{
  campaignId: string;
  status: string;
}> {
  // Calculate end date
  const startDate = new Date(input.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + input.durationDays - 1);

  // Create campaign record
  const campaign = await prisma.campaign.create({
    data: {
      name: input.name,
      description: input.description,
      campaignType: input.campaignType,
      goal: input.goal,
      productName: input.productName,
      productUrl: input.productUrl,
      topic: input.topic,
      keyMessages: input.keyMessages,
      startDate,
      endDate,
      durationDays: input.durationDays,
      platforms: input.platforms,
      postsPerDayTwitter: input.postsPerDay.twitter,
      postsPerDayFacebook: input.postsPerDay.facebook,
      postsPerDayInstagram: input.postsPerDay.instagram,
      youtubeShorts: input.youtubeShorts,
      youtubeStandard: input.youtubeStandard,
      status: "generating",
    },
  });

  // Generate content in background
  generateCampaignContent(campaign.id, input).catch((error) => {
    console.error(`[Campaign] Generation failed for ${campaign.id}:`, error);
  });

  return {
    campaignId: campaign.id,
    status: "generating",
  };
}

/**
 * Generate all campaign content (runs in background)
 */
async function generateCampaignContent(
  campaignId: string,
  input: CreateCampaignInput
): Promise<void> {
  try {
    console.log(`[Campaign] Starting generation for ${campaignId}`);

    // Generate strategy with Claude
    const strategy = await generateCampaignStrategy(input);

    console.log(`[Campaign] Strategy generated: ${strategy.posts.length} posts, ${strategy.videos.length} videos`);

    // Save strategy to campaign
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { strategy: strategy as object },
    });

    // Create phases
    const phaseMap = new Map<string, string>();
    for (let i = 0; i < strategy.phases.length; i++) {
      const phase = strategy.phases[i];
      const createdPhase = await prisma.campaignPhase.create({
        data: {
          campaignId,
          name: phase.name,
          orderIndex: i,
          purpose: phase.purpose,
          startDay: phase.startDay,
          endDay: phase.endDay,
          themes: phase.themes,
          hooks: phase.hooks,
          ctas: phase.ctas,
        },
      });
      phaseMap.set(phase.name, createdPhase.id);
    }

    // Create posts
    const startDate = new Date(input.startDate);
    for (const post of strategy.posts) {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(scheduledDate.getDate() + post.dayNumber - 1);
      scheduledDate.setHours(9, 0, 0, 0); // Default time, will be optimized later

      await prisma.campaignPost.create({
        data: {
          campaignId,
          phaseId: phaseMap.get(post.phase) || null,
          platform: post.platform,
          content: post.content,
          contentType: post.contentType,
          hashtags: post.hashtags,
          dayNumber: post.dayNumber,
          scheduledFor: scheduledDate,
          visualType: post.visualType,
          visualPrompt: post.visualPrompt,
          status: "draft",
        },
      });
    }

    // Create videos
    for (const video of strategy.videos) {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(scheduledDate.getDate() + video.dayNumber - 1);
      scheduledDate.setHours(14, 0, 0, 0); // Default to 2 PM

      await prisma.campaignVideo.create({
        data: {
          campaignId,
          videoType: video.videoType,
          title: video.title,
          purpose: video.purpose,
          scriptData: video.script as object,
          dayNumber: video.dayNumber,
          scheduledFor: scheduledDate,
          status: "pending",
        },
      });
    }

    // Update campaign status and counts
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "review",
        totalPosts: strategy.posts.length,
        totalVideos: strategy.videos.length,
      },
    });

    console.log(`[Campaign] Generation complete for ${campaignId}`);
  } catch (error) {
    console.error(`[Campaign] Generation error for ${campaignId}:`, error);
    
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "draft" },
    });
    
    throw error;
  }
}

/**
 * Get campaign with all related data
 */
export async function getCampaign(campaignId: string) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      phases: {
        orderBy: { orderIndex: "asc" },
      },
      posts: {
        orderBy: [{ dayNumber: "asc" }, { platform: "asc" }],
      },
      videos: {
        orderBy: { dayNumber: "asc" },
      },
      emailSequence: {
        include: {
          emails: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
}

/**
 * Get all campaigns
 */
export async function listCampaigns() {
  return prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          posts: true,
          videos: true,
        },
      },
    },
  });
}

/**
 * Update a campaign post
 */
export async function updateCampaignPost(
  postId: string,
  data: {
    content?: string;
    hashtags?: string[];
    visualPrompt?: string;
    scheduledFor?: Date;
  }
) {
  return prisma.campaignPost.update({
    where: { id: postId },
    data,
  });
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string) {
  return prisma.campaign.delete({
    where: { id: campaignId },
  });
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: string
) {
  const updateData: Record<string, unknown> = { status };
  
  if (status === "active") {
    updateData.launchedAt = new Date();
  } else if (status === "completed") {
    updateData.completedAt = new Date();
  }
  
  return prisma.campaign.update({
    where: { id: campaignId },
    data: updateData,
  });
}




