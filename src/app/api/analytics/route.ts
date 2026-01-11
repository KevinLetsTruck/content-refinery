import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { generateInsights } from "@/lib/analytics/learning-engine";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30";
  const platform = searchParams.get("platform") || undefined;

  const periodDays = parseInt(period) || 30;
  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const where = {
    publishedAt: { gte: startDate },
    ...(platform && { platform }),
  };

  // Fallback query for GeneratedContent (published posts)
  const contentWhere = {
    status: "published",
    publishedAt: { gte: startDate },
    ...(platform && { platform }),
  };

  try {
    // First, check if we have any PostPerformance data
    const performanceCount = await prisma.postPerformance.count({ where });

    // Also count published content directly
    const publishedCount = await prisma.generatedContent.count({
      where: contentWhere,
    });

    // If no PostPerformance but we have published content, use GeneratedContent data
    const useContentFallback = performanceCount === 0 && publishedCount > 0;

    // Overview stats
    const [
      totalPosts,
      avgMetrics,
      performanceLevelsData,
      topPosts,
      platformStats,
      formulaStatsData,
      pillarStatsData,
      recentTests,
    ] = await Promise.all([
      // Total posts - use published content count if no performance data
      useContentFallback
        ? publishedCount
        : prisma.postPerformance.count({ where }),

      // Average metrics
      prisma.postPerformance.aggregate({
        where,
        _avg: {
          engagementRate: true,
          impressions: true,
          likes: true,
          shares: true,
        },
        _sum: {
          impressions: true,
          likes: true,
          shares: true,
          comments: true,
        },
      }),

      // By performance level
      prisma.postPerformance.groupBy({
        by: ["performanceLevel"],
        where,
        _count: { _all: true },
      }),

      // Top performing posts - fallback to published content if no performance data
      useContentFallback
        ? prisma.generatedContent.findMany({
            where: contentWhere,
            orderBy: { publishedAt: "desc" },
            take: 10,
          })
        : prisma.postPerformance.findMany({
            where,
            orderBy: { engagementRate: "desc" },
            take: 10,
            include: {
              generatedContent: {
                select: { text: true, platform: true, platformPostUrl: true },
              },
            },
          }),

      // By platform - fallback to GeneratedContent grouping
      useContentFallback
        ? prisma.generatedContent.groupBy({
            by: ["platform"],
            where: contentWhere,
            _count: { _all: true },
          })
        : prisma.postPerformance.groupBy({
            by: ["platform"],
            where: { publishedAt: { gte: startDate } },
            _avg: { engagementRate: true },
            _sum: { impressions: true, likes: true, shares: true },
            _count: { _all: true },
          }),

      // By formula
      prisma.postPerformance.groupBy({
        by: ["formula"],
        where: { ...where, formula: { not: null } },
        _avg: { engagementRate: true },
        _count: { _all: true },
      }),

      // By pillar
      prisma.postPerformance.groupBy({
        by: ["pillar"],
        where: { ...where, pillar: { not: null } },
        _avg: { engagementRate: true },
        _count: { _all: true },
      }),

      // Recent A/B tests
      prisma.aBTest.findMany({
        where: { status: { in: ["running", "completed"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
    
    // Get daily stats - use different query based on data source
    let dailyStats: Array<{
      date: Date;
      posts: number;
      avg_engagement: number | null;
      total_impressions: number;
    }> = [];

    if (useContentFallback) {
      // Use GeneratedContent for daily stats
      const rawDailyStats = await prisma.$queryRawUnsafe<Array<{
        date: Date;
        posts: bigint;
      }>>(`
        SELECT
          DATE("published_at") as date,
          COUNT(*) as posts
        FROM "generated_content"
        WHERE "status" = 'published' AND "published_at" >= $1
        GROUP BY DATE("published_at")
        ORDER BY date ASC
      `, startDate);

      dailyStats = rawDailyStats.map(d => ({
        date: d.date,
        posts: Number(d.posts),
        avg_engagement: null,
        total_impressions: 0,
      }));
    } else {
      const rawDailyStats = await prisma.$queryRawUnsafe<Array<{
        date: Date;
        posts: bigint;
        avg_engagement: number;
        total_impressions: bigint;
      }>>(`
        SELECT
          DATE("published_at") as date,
          COUNT(*) as posts,
          AVG("engagement_rate") as avg_engagement,
          SUM("impressions") as total_impressions
        FROM "post_performance"
        WHERE "published_at" >= $1
        GROUP BY DATE("published_at")
        ORDER BY date ASC
      `, startDate);

      dailyStats = rawDailyStats.map(d => ({
        date: d.date,
        posts: Number(d.posts),
        avg_engagement: d.avg_engagement,
        total_impressions: Number(d.total_impressions),
      }));
    }

    // Generate insights
    const insights = await generateInsights(periodDays);

    // Sort performance levels
    const performanceLevels = performanceLevelsData.reduce((acc, p) => {
      acc[p.performanceLevel] = p._count._all;
      return acc;
    }, {} as Record<string, number>);

    // Sort formula stats
    const formulaStats = formulaStatsData
      .map(f => ({
        formula: f.formula,
        posts: f._count._all,
        avgEngagement: f._avg.engagementRate?.toNumber() || 0,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Sort pillar stats
    const pillarStats = pillarStatsData
      .map(p => ({
        pillar: p.pillar,
        posts: p._count._all,
        avgEngagement: p._avg.engagementRate?.toNumber() || 0,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Format top posts based on data source
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedTopPosts = useContentFallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (topPosts as any[]).map((p) => ({
          id: p.id,
          platform: p.platform,
          text: p.text?.substring(0, 120) + (p.text?.length > 120 ? "..." : ""),
          url: p.platformPostUrl,
          engagementRate: null, // No metrics yet
          impressions: null,
          likes: null,
          shares: null,
          formula: p.formula,
          pillar: p.pillar,
          performanceLevel: "pending",
          publishedAt: p.publishedAt,
        }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (topPosts as any[]).map((p) => ({
          id: p.id,
          platform: p.platform,
          text: p.generatedContent?.text?.substring(0, 120) + "...",
          url: p.generatedContent?.platformPostUrl,
          engagementRate: p.engagementRate?.toNumber?.() ?? p.engagementRate ?? 0,
          impressions: p.impressions,
          likes: p.likes,
          shares: p.shares,
          formula: p.formula,
          pillar: p.pillar,
          performanceLevel: p.performanceLevel,
          publishedAt: p.publishedAt,
        }));

    // Format platform stats based on data source
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedPlatformStats = useContentFallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (platformStats as any[]).map((p) => ({
          platform: p.platform,
          posts: p._count._all,
          avgEngagement: null, // No metrics yet
          totalImpressions: null,
          totalLikes: null,
          totalShares: null,
        }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (platformStats as any[]).map((p) => ({
          platform: p.platform,
          posts: p._count._all,
          avgEngagement: p._avg?.engagementRate?.toNumber?.() ?? p._avg?.engagementRate ?? 0,
          totalImpressions: p._sum?.impressions || 0,
          totalLikes: p._sum?.likes || 0,
          totalShares: p._sum?.shares || 0,
        }));

    return NextResponse.json({
      period: `${periodDays} days`,
      dataSource: useContentFallback ? "published_content" : "performance_metrics",
      metricsStatus: useContentFallback
        ? "Metrics collection pending - showing published content"
        : "Metrics available",
      overview: {
        totalPosts,
        avgEngagement: avgMetrics._avg.engagementRate?.toNumber() || 0,
        totalImpressions: avgMetrics._sum.impressions || 0,
        totalLikes: avgMetrics._sum.likes || 0,
        totalShares: avgMetrics._sum.shares || 0,
        totalComments: avgMetrics._sum.comments || 0,
      },
      performanceLevels,
      topPosts: formattedTopPosts,
      platformStats: formattedPlatformStats,
      formulaStats,
      pillarStats,
      dailyStats: dailyStats.map(d => ({
        date: d.date,
        posts: d.posts,
        avg_engagement: d.avg_engagement,
        total_impressions: d.total_impressions,
      })),
      recentTests: recentTests.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        testVariable: t.testVariable,
        platform: t.platform,
        pillar: t.pillar,
        winner: t.winningVariant,
        confidence: t.confidenceLevel?.toNumber() || 0,
        lift: t.liftPercentage?.toNumber() || 0,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
      })),
      insights,
    });
    
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

