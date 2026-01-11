import prisma from "@/lib/db/prisma";
import { generateCampaignStrategy } from "./strategy-generator";
import { CreateCampaignInput } from "./types";
import {
  generateAndStoreImage,
  createImagePrompt,
  isDalleAvailable
} from "@/lib/images/dalle";
import { getConstantContactClient } from "@/lib/constant-contact/client";

/**
 * Create a new campaign and generate all content
 */
export async function createCampaign(input: CreateCampaignInput): Promise<{
  campaignId: string;
  status: string;
  ccListId?: string;
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

  let ccListId: string | undefined;

  // If email sequence is provided, link it to the campaign and create CC list
  if (input.emailSequenceId) {
    console.log(`[Campaign] Linking email sequence ${input.emailSequenceId} to campaign ${campaign.id}`);

    // Link email sequence to campaign
    await prisma.emailSequence.update({
      where: { id: input.emailSequenceId },
      data: { campaignId: campaign.id },
    });

    // Create Constant Contact list for this campaign
    try {
      ccListId = await createCampaignEmailList(campaign.id, input.name, input.emailSequenceId);
      console.log(`[Campaign] Created CC list ${ccListId} for campaign ${campaign.id}`);
    } catch (error) {
      // Don't fail campaign creation if CC list creation fails
      console.error(`[Campaign] Failed to create CC list for ${campaign.id}:`, error);
    }
  }

  // Generate content in background
  generateCampaignContent(campaign.id, input).catch((error) => {
    console.error(`[Campaign] Generation failed for ${campaign.id}:`, error);
  });

  return {
    campaignId: campaign.id,
    status: "generating",
    ccListId,
  };
}

/**
 * Create a Constant Contact list for a campaign
 * This list will be used to collect leads and send nurture emails
 */
async function createCampaignEmailList(
  campaignId: string,
  campaignName: string,
  emailSequenceId: string
): Promise<string> {
  const client = getConstantContactClient();

  // Check if CC is authenticated
  const isAuth = await client.isAuthenticated();
  if (!isAuth) {
    throw new Error("Constant Contact not authenticated. Please complete OAuth flow first.");
  }

  // Create list name based on campaign
  const listName = `${campaignName} - Subscribers`;
  const listDescription = `Subscribers for campaign: ${campaignName}`;

  // Create the list in Constant Contact
  const ccList = await client.createList(listName, listDescription);

  console.log(`[Campaign] Created Constant Contact list: ${ccList.list_id} - ${listName}`);

  // Update email sequence with the CC list ID
  await prisma.emailSequence.update({
    where: { id: emailSequenceId },
    data: { listId: ccList.list_id },
  });

  console.log(`[Campaign] Linked CC list ${ccList.list_id} to email sequence ${emailSequenceId}`);

  return ccList.list_id;
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
    const createdPosts: Array<{ id: string; platform: string; content: string; visualPrompt: string | null }> = [];

    for (const post of strategy.posts) {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(scheduledDate.getDate() + post.dayNumber - 1);
      scheduledDate.setHours(9, 0, 0, 0); // Default time, will be optimized later

      const createdPost = await prisma.campaignPost.create({
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
          visualStatus: input.generateImages ? "pending" : "pending",
        },
      });

      createdPosts.push({
        id: createdPost.id,
        platform: post.platform,
        content: post.content,
        visualPrompt: post.visualPrompt,
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

    // Generate images if requested
    if (input.generateImages && isDalleAvailable()) {
      console.log(`[Campaign] Starting image generation for ${createdPosts.length} posts`);

      // Generate images in batches to avoid rate limits
      const BATCH_SIZE = 3;
      const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

      for (let i = 0; i < createdPosts.length; i += BATCH_SIZE) {
        const batch = createdPosts.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (post) => {
            try {
              // Mark as generating
              await prisma.campaignPost.update({
                where: { id: post.id },
                data: { visualStatus: "generating" },
              });

              // Use custom prompt if available, otherwise generate from content
              const prompt = post.visualPrompt || createImagePrompt(post.content, "educational", post.platform);

              const imageUrl = await generateAndStoreImage(prompt, post.platform);

              // Update post with generated image
              await prisma.campaignPost.update({
                where: { id: post.id },
                data: {
                  visualUrl: imageUrl,
                  visualStatus: "ready",
                },
              });

              console.log(`[Campaign] Generated image for post ${post.id}`);
            } catch (error) {
              console.error(`[Campaign] Failed to generate image for post ${post.id}:`, error);

              await prisma.campaignPost.update({
                where: { id: post.id },
                data: { visualStatus: "error" },
              });
            }
          })
        );

        // Add delay between batches to avoid rate limits
        if (i + BATCH_SIZE < createdPosts.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      console.log(`[Campaign] Image generation complete for ${campaignId}`);
    } else if (input.generateImages && !isDalleAvailable()) {
      console.warn(`[Campaign] Image generation requested but DALL-E is not configured`);
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




