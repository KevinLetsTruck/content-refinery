import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    // Date ranges
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // Stats from GeneratedContent (ad-hoc posts)
    const postsToday = await prisma.generatedContent.count({
      where: {
        scheduledFor: { gte: startOfToday, lte: endOfToday },
        status: { in: ["scheduled", "published"] },
      },
    });

    const postsThisWeek = await prisma.generatedContent.count({
      where: {
        scheduledFor: { gte: startOfWeek },
        status: { in: ["scheduled", "published"] },
      },
    });

    const publishedThisWeek = await prisma.generatedContent.count({
      where: {
        publishedAt: { gte: startOfWeek },
        status: "published",
      },
    });

    const failedPosts = await prisma.generatedContent.count({
      where: { status: "failed" },
    });

    const pendingReview = await prisma.generatedContent.count({
      where: { status: { in: ["pending", "pending_review"] } },
    });

    // Stats from CampaignPost (campaign posts)
    const campaignPostsToday = await prisma.campaignPost.count({
      where: {
        scheduledFor: { gte: startOfToday, lte: endOfToday },
        status: { in: ["scheduled", "published", "draft"] },
      },
    });

    const campaignPostsThisWeek = await prisma.campaignPost.count({
      where: {
        scheduledFor: { gte: startOfWeek },
        status: { in: ["scheduled", "published", "draft"] },
      },
    });

    const campaignPublishedThisWeek = await prisma.campaignPost.count({
      where: {
        publishedAt: { gte: startOfWeek },
        status: "published",
      },
    });

    // Combine stats
    const totalPostsToday = postsToday + campaignPostsToday;
    const totalPostsThisWeek = postsThisWeek + campaignPostsThisWeek;
    const totalPublishedThisWeek = publishedThisWeek + campaignPublishedThisWeek;

    // Engagement stats (from PostPerformance if available)
    let totalEngagement = 0;
    let engagementChange = 0;
    let impressions = 0;

    try {
      const thisWeekPerf = await prisma.postPerformance.aggregate({
        where: { publishedAt: { gte: startOfWeek } },
        _sum: { likes: true, comments: true, shares: true, impressions: true },
      });

      const lastWeekPerf = await prisma.postPerformance.aggregate({
        where: {
          publishedAt: { gte: startOfLastWeek, lt: startOfWeek },
        },
        _sum: { likes: true, comments: true, shares: true },
      });

      const thisWeekTotal =
        (thisWeekPerf._sum.likes || 0) +
        (thisWeekPerf._sum.comments || 0) +
        (thisWeekPerf._sum.shares || 0);

      const lastWeekTotal =
        (lastWeekPerf._sum.likes || 0) +
        (lastWeekPerf._sum.comments || 0) +
        (lastWeekPerf._sum.shares || 0);

      totalEngagement = thisWeekTotal;
      impressions = thisWeekPerf._sum.impressions || 0;

      if (lastWeekTotal > 0) {
        engagementChange = Math.round(
          ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
        );
      }
    } catch {
      // PostPerformance table may not exist - that's okay
    }

    // Calculate content streak
    const contentStreak = await calculateContentStreak();

    // Today's posts from GeneratedContent
    const todaysGeneratedPosts = await prisma.generatedContent.findMany({
      where: {
        scheduledFor: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { scheduledFor: "asc" },
      take: 10,
    });

    // Today's posts from CampaignPost
    const todaysCampaignPosts = await prisma.campaignPost.findMany({
      where: {
        scheduledFor: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { scheduledFor: "asc" },
      take: 10,
      include: {
        campaign: { select: { name: true } },
      },
    });

    // Combine and sort today's posts
    const combinedTodaysPosts = [
      ...todaysGeneratedPosts.map((post) => ({
        id: post.id,
        title: post.title || "",
        content: post.text || "",
        platform: post.platform,
        scheduledFor: post.scheduledFor?.toISOString() || "",
        status: post.status,
        source: "generated" as const,
      })),
      ...todaysCampaignPosts.map((post) => ({
        id: post.id,
        title: post.campaign?.name || "",
        content: post.content || "",
        platform: post.platform,
        scheduledFor: post.scheduledFor?.toISOString() || "",
        status: post.status,
        source: "campaign" as const,
      })),
    ].sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

    // Recent activity - combine published and created from both sources
    const recentContent = await prisma.generatedContent.findMany({
      where: {
        OR: [
          { publishedAt: { not: null } },
          { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const recentCampaignPosts = await prisma.campaignPost.findMany({
      where: {
        OR: [
          { publishedAt: { not: null } },
          { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        campaign: { select: { name: true } },
      },
    });

    // Combine recent activity
    const recentActivity = [
      ...recentContent.map((content) => ({
        id: content.id,
        type:
          content.status === "published"
            ? "published"
            : content.status === "failed"
            ? "failed"
            : "created",
        title:
          content.status === "published"
            ? `Published to ${content.platform}`
            : content.status === "failed"
            ? `Failed to publish to ${content.platform}`
            : `Created new ${content.platform} post`,
        platform: content.platform,
        timestamp: (content.publishedAt || content.createdAt).toISOString(),
        details: content.title || content.text?.substring(0, 50) || "",
      })),
      ...recentCampaignPosts.map((post) => ({
        id: post.id,
        type:
          post.status === "published"
            ? "published"
            : post.status === "failed"
            ? "failed"
            : "created",
        title:
          post.status === "published"
            ? `Published to ${post.platform}`
            : post.status === "failed"
            ? `Failed to publish to ${post.platform}`
            : `Created new ${post.platform} post`,
        platform: post.platform,
        timestamp: (post.publishedAt || post.createdAt).toISOString(),
        details: post.campaign?.name || post.content?.substring(0, 50) || "",
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Top performing posts
    let topPosts: Array<{
      id: string;
      content: string;
      platform: string;
      publishedAt: string | null;
      impressions: number;
      engagements: number;
      clicks: number;
    }> = [];

    try {
      const topPerformers = await prisma.postPerformance.findMany({
        where: {
          publishedAt: { gte: startOfWeek },
        },
        orderBy: [{ likes: "desc" }, { comments: "desc" }],
        take: 5,
        include: {
          generatedContent: true,
        },
      });

      topPosts = topPerformers.map((perf) => ({
        id: perf.generatedContentId,
        content: perf.generatedContent?.text || "",
        platform: perf.platform,
        publishedAt: perf.generatedContent?.publishedAt?.toISOString() || null,
        impressions: perf.impressions || 0,
        engagements:
          (perf.likes || 0) + (perf.comments || 0) + (perf.shares || 0),
        clicks: perf.clicks || 0,
      }));
    } catch {
      // PostPerformance may not exist - that's okay
    }

    return NextResponse.json({
      stats: {
        postsToday: totalPostsToday,
        postsThisWeek: totalPostsThisWeek,
        publishedThisWeek: totalPublishedThisWeek,
        failedPosts,
        pendingReview,
        totalEngagement,
        engagementChange,
        impressions,
        contentStreak,
      },
      todaysPosts: combinedTodaysPosts,
      recentActivity,
      topPosts,
    });
  } catch (error) {
    console.error("[Dashboard] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

async function calculateContentStreak(): Promise<number> {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - i);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const postsOnDay = await prisma.generatedContent.count({
      where: {
        publishedAt: { gte: dayStart, lte: dayEnd },
        status: "published",
      },
    });

    if (postsOnDay > 0) {
      streak++;
    } else if (i > 0) {
      // Allow today to have no posts without breaking streak
      break;
    }
  }

  return streak;
}

