import prisma from "@/lib/db/prisma";
import { classifyPerformance, calculateMetrics, RawMetrics } from "./types";

interface TrackPublishParams {
  generatedContentId: string;
  platform: string;
  publishedAt: Date;
  formula?: string;
  hookType?: string;
  pillar?: string;
  objective?: string;
  contentType?: string;
  abTestId?: string;
  variant?: string;
}

/**
 * Create initial performance record when content is published
 */
export async function trackPublish(params: TrackPublishParams): Promise<string> {
  const record = await prisma.postPerformance.create({
    data: {
      generatedContentId: params.generatedContentId,
      platform: params.platform,
      publishedAt: params.publishedAt,
      dayOfWeek: params.publishedAt.getDay(),
      hourOfDay: params.publishedAt.getHours(),
      formula: params.formula || null,
      hookType: params.hookType || null,
      pillar: params.pillar || null,
      objective: params.objective || null,
      contentType: params.contentType || null,
      abTestId: params.abTestId || null,
      variant: params.variant || null,
      performanceLevel: "pending",
    },
  });
  
  console.log(`[Analytics] Created performance record ${record.id} for content ${params.generatedContentId}`);
  return record.id;
}

/**
 * Update performance record with new metrics
 */
export async function updateMetrics(
  generatedContentId: string,
  metrics: RawMetrics
): Promise<void> {
  // Get current record to know the platform
  const current = await prisma.postPerformance.findUnique({
    where: { generatedContentId },
  });
  
  if (!current) {
    console.warn(`[Analytics] No performance record for ${generatedContentId}`);
    return;
  }
  
  // Calculate derived metrics
  const calculated = calculateMetrics(metrics);
  const performanceLevel = classifyPerformance(calculated.engagementRate, current.platform);
  
  // Update record
  await prisma.postPerformance.update({
    where: { generatedContentId },
    data: {
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
  
  console.log(`[Analytics] Updated metrics for ${generatedContentId}: ${performanceLevel}`);
}

/**
 * Get performance summary for a time period
 */
export async function getPerformanceSummary(
  platform?: string,
  days: number = 30
): Promise<{
  totalPosts: number;
  avgEngagement: number;
  byLevel: Record<string, number>;
  byFormula: Record<string, { count: number; avgEngagement: number }>;
  byPillar: Record<string, { count: number; avgEngagement: number }>;
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const where = {
    publishedAt: { gte: startDate },
    ...(platform && { platform }),
  };
  
  // Total posts and avg engagement
  const aggregate = await prisma.postPerformance.aggregate({
    where,
    _count: { _all: true },
    _avg: { engagementRate: true },
  });
  
  // By performance level
  const byLevel = await prisma.postPerformance.groupBy({
    by: ["performanceLevel"],
    where,
    _count: { _all: true },
  });
  
  // By formula
  const byFormula = await prisma.postPerformance.groupBy({
    by: ["formula"],
    where: { ...where, formula: { not: null } },
    _count: { _all: true },
    _avg: { engagementRate: true },
  });
  
  // By pillar
  const byPillar = await prisma.postPerformance.groupBy({
    by: ["pillar"],
    where: { ...where, pillar: { not: null } },
    _count: { _all: true },
    _avg: { engagementRate: true },
  });
  
  return {
    totalPosts: aggregate._count._all,
    avgEngagement: aggregate._avg.engagementRate?.toNumber() || 0,
    byLevel: byLevel.reduce((acc, item) => {
      acc[item.performanceLevel] = item._count._all;
      return acc;
    }, {} as Record<string, number>),
    byFormula: byFormula.reduce((acc, item) => {
      if (item.formula) {
        acc[item.formula] = {
          count: item._count._all,
          avgEngagement: item._avg.engagementRate?.toNumber() || 0,
        };
      }
      return acc;
    }, {} as Record<string, { count: number; avgEngagement: number }>),
    byPillar: byPillar.reduce((acc, item) => {
      if (item.pillar) {
        acc[item.pillar] = {
          count: item._count._all,
          avgEngagement: item._avg.engagementRate?.toNumber() || 0,
        };
      }
      return acc;
    }, {} as Record<string, { count: number; avgEngagement: number }>),
  };
}

/**
 * Get top performing content
 */
export async function getTopPerformers(
  platform?: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  contentId: string;
  platform: string;
  formula: string | null;
  pillar: string | null;
  engagementRate: number;
  performanceLevel: string;
  publishedAt: Date;
}>> {
  const results = await prisma.postPerformance.findMany({
    where: {
      ...(platform && { platform }),
      performanceLevel: { in: ["viral", "excellent", "good"] },
    },
    orderBy: { engagementRate: "desc" },
    take: limit,
    select: {
      id: true,
      generatedContentId: true,
      platform: true,
      formula: true,
      pillar: true,
      engagementRate: true,
      performanceLevel: true,
      publishedAt: true,
    },
  });
  
  return results.map(r => ({
    id: r.id,
    contentId: r.generatedContentId,
    platform: r.platform,
    formula: r.formula,
    pillar: r.pillar,
    engagementRate: r.engagementRate.toNumber(),
    performanceLevel: r.performanceLevel,
    publishedAt: r.publishedAt,
  }));
}

/**
 * Get formula performance rankings
 */
export async function getFormulaRankings(
  platform?: string
): Promise<Array<{
  formula: string;
  avgEngagement: number;
  postCount: number;
  viralCount: number;
}>> {
  const where = {
    formula: { not: null },
    ...(platform && { platform }),
  };
  
  const formulas = await prisma.postPerformance.groupBy({
    by: ["formula"],
    where,
    _count: { _all: true },
    _avg: { engagementRate: true },
  });
  
  // Get viral counts separately
  const viralCounts = await prisma.postPerformance.groupBy({
    by: ["formula"],
    where: { ...where, performanceLevel: "viral" },
    _count: { _all: true },
  });
  
  const viralMap = viralCounts.reduce((acc, item) => {
    if (item.formula) acc[item.formula] = item._count._all;
    return acc;
  }, {} as Record<string, number>);
  
  return formulas
    .filter(f => f.formula)
    .map(f => ({
      formula: f.formula!,
      avgEngagement: f._avg.engagementRate?.toNumber() || 0,
      postCount: f._count._all,
      viralCount: viralMap[f.formula!] || 0,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

/**
 * Get best posting times based on actual performance
 */
export async function getBestPostingTimes(
  platform?: string
): Promise<Array<{
  dayOfWeek: number;
  hourOfDay: number;
  avgEngagement: number;
  sampleSize: number;
}>> {
  const where = platform ? { platform } : {};
  
  const times = await prisma.postPerformance.groupBy({
    by: ["dayOfWeek", "hourOfDay"],
    where,
    _count: { _all: true },
    _avg: { engagementRate: true },
  });
  
  return times
    .map(t => ({
      dayOfWeek: t.dayOfWeek,
      hourOfDay: t.hourOfDay,
      avgEngagement: t._avg.engagementRate?.toNumber() || 0,
      sampleSize: t._count._all,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

