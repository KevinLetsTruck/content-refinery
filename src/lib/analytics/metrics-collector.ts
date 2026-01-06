import prisma from "@/lib/db/prisma";
import { getTwitterMetrics } from "./platforms/twitter-metrics";
import { getFacebookMetrics } from "./platforms/facebook-metrics";
import { getInstagramMetrics } from "./platforms/instagram-metrics";
import { calculateMetrics, classifyPerformance, RawMetrics } from "./types";

interface CollectionResult {
  processed: number;
  updated: number;
  errors: number;
  skipped: number;
  platforms: Record<string, { processed: number; errors: number }>;
}

/**
 * Collect metrics for all published posts
 * Called by cron job every 6 hours
 */
export async function collectAllMetrics(): Promise<CollectionResult> {
  const result: CollectionResult = {
    processed: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
    platforms: {},
  };
  
  console.log("[Metrics] Starting collection run...");
  
  // Get posts that need metrics update
  const posts = await prisma.generatedContent.findMany({
    where: {
      status: "published",
      platformPostId: { not: null },
      publishedAt: {
        // Only fetch for posts from last 30 days
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      performance: true,
      extraction: true,
    },
    orderBy: [
      // Prioritize posts that haven't been fetched recently
      { publishedAt: "desc" },
    ],
    take: 200, // Limit batch size for rate limits
  });
  
  console.log(`[Metrics] Found ${posts.length} posts to process`);
  
  // Group by platform for efficient batching
  const byPlatform: Record<string, typeof posts> = {};
  for (const post of posts) {
    const platform = post.platform;
    if (!byPlatform[platform]) {
      byPlatform[platform] = [];
    }
    byPlatform[platform].push(post);
  }
  
  // Process each platform
  for (const [platform, platformPosts] of Object.entries(byPlatform)) {
    result.platforms[platform] = { processed: 0, errors: 0 };
    
    console.log(`[Metrics] Processing ${platformPosts.length} ${platform} posts`);
    
    for (const post of platformPosts) {
      try {
        let metrics: RawMetrics;
        
        switch (platform) {
          case "twitter":
            metrics = await getTwitterMetrics(post.platformPostId!);
            break;
          case "facebook":
            metrics = await getFacebookMetrics(post.platformPostId!);
            break;
          case "instagram":
            metrics = await getInstagramMetrics(post.platformPostId!);
            break;
          default:
            result.skipped++;
            continue;
        }
        
        // Calculate derived metrics
        const calculated = calculateMetrics(metrics);
        const performanceLevel = classifyPerformance(calculated.engagementRate, platform);
        
        // Get metadata from post
        const metadata = (post.metadata as Record<string, unknown>) || {};
        
        // Upsert performance record
        await prisma.postPerformance.upsert({
          where: { generatedContentId: post.id },
          create: {
            generatedContentId: post.id,
            platform,
            formula: (metadata.formula as string) || null,
            hookType: (metadata.hookType as string) || null,
            pillar: (metadata.pillar as string) || null,
            objective: (metadata.objective as string) || null,
            contentType: post.extraction?.type || null,
            publishedAt: post.publishedAt!,
            dayOfWeek: post.publishedAt!.getDay(),
            hourOfDay: post.publishedAt!.getHours(),
            ...metrics,
            engagementRate: calculated.engagementRate,
            clickRate: calculated.clickRate,
            viralityScore: calculated.viralityScore,
            saveRate: calculated.saveRate,
            performanceLevel,
            lastFetchedAt: new Date(),
            fetchCount: 1,
          },
          update: {
            ...metrics,
            engagementRate: calculated.engagementRate,
            clickRate: calculated.clickRate,
            viralityScore: calculated.viralityScore,
            saveRate: calculated.saveRate,
            performanceLevel,
            lastFetchedAt: new Date(),
            fetchCount: { increment: 1 },
          },
        });
        
        result.updated++;
        result.platforms[platform].processed++;
        
      } catch (error) {
        console.error(`[Metrics] Error processing ${post.id}:`, error);
        result.errors++;
        result.platforms[platform].errors++;
      }
      
      result.processed++;
      
      // Rate limit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`[Metrics] Collection complete:`, result);
  
  return result;
}

/**
 * Collect metrics for a single post (on-demand)
 */
export async function collectMetricsForPost(generatedContentId: string): Promise<boolean> {
  const post = await prisma.generatedContent.findUnique({
    where: { id: generatedContentId },
    include: { extraction: true },
  });
  
  if (!post || !post.platformPostId) {
    console.warn(`[Metrics] Post ${generatedContentId} not found or not published`);
    return false;
  }
  
  try {
    let metrics: RawMetrics;
    
    switch (post.platform) {
      case "twitter":
        metrics = await getTwitterMetrics(post.platformPostId);
        break;
      case "facebook":
        metrics = await getFacebookMetrics(post.platformPostId);
        break;
      case "instagram":
        metrics = await getInstagramMetrics(post.platformPostId);
        break;
      default:
        return false;
    }
    
    const calculated = calculateMetrics(metrics);
    const performanceLevel = classifyPerformance(calculated.engagementRate, post.platform);
    
    // Get metadata from post
    const metadata = (post.metadata as Record<string, unknown>) || {};
    
    await prisma.postPerformance.upsert({
      where: { generatedContentId: post.id },
      create: {
        generatedContentId: post.id,
        platform: post.platform,
        formula: (metadata.formula as string) || null,
        hookType: (metadata.hookType as string) || null,
        pillar: (metadata.pillar as string) || null,
        objective: (metadata.objective as string) || null,
        contentType: post.extraction?.type || null,
        publishedAt: post.publishedAt!,
        dayOfWeek: post.publishedAt!.getDay(),
        hourOfDay: post.publishedAt!.getHours(),
        ...metrics,
        engagementRate: calculated.engagementRate,
        clickRate: calculated.clickRate,
        viralityScore: calculated.viralityScore,
        saveRate: calculated.saveRate,
        performanceLevel,
        lastFetchedAt: new Date(),
        fetchCount: 1,
      },
      update: {
        ...metrics,
        engagementRate: calculated.engagementRate,
        clickRate: calculated.clickRate,
        viralityScore: calculated.viralityScore,
        saveRate: calculated.saveRate,
        performanceLevel,
        lastFetchedAt: new Date(),
        fetchCount: { increment: 1 },
      },
    });
    
    return true;
  } catch (error) {
    console.error(`[Metrics] Error collecting for ${generatedContentId}:`, error);
    return false;
  }
}




