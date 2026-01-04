import prisma from "@/lib/db/prisma";

/**
 * Recalculate all weights based on performance data
 * Should run weekly or after significant new data
 */
export async function updateAllWeights(): Promise<{
  formulaWeights: number;
  hookWeights: number;
  timingInsights: number;
}> {
  const results = {
    formulaWeights: 0,
    hookWeights: 0,
    timingInsights: 0,
  };
  
  results.formulaWeights = await updateFormulaWeights();
  results.hookWeights = await updateHookWeights();
  results.timingInsights = await updateTimingInsights();
  
  console.log("[Learning] Weights updated:", results);
  
  return results;
}

/**
 * Update formula weights based on engagement data
 */
export async function updateFormulaWeights(): Promise<number> {
  const platforms = ["twitter", "facebook", "instagram"];
  const pillars = ["all", "proper_human_diet", "gut_health", "sleep_recovery", "detox_environment", "mental_performance"];
  
  let updated = 0;
  
  for (const platform of platforms) {
    for (const pillar of pillars) {
      // Get performance data grouped by formula
      const where = {
        platform,
        formula: { not: null },
        impressions: { gte: 100 }, // Only consider posts with meaningful reach
        ...(pillar !== "all" && { pillar }),
      };
      
      const data = await prisma.postPerformance.groupBy({
        by: ["formula"],
        where,
        _avg: {
          engagementRate: true,
        },
        _count: {
          _all: true,
        },
      });
      
      // Need at least 3 formulas with data
      if (data.length < 3) continue;
      
      // Calculate average engagement across all formulas
      const totalEngagement = data.reduce((sum, d) => 
        sum + (d._avg.engagementRate?.toNumber() || 0), 0);
      const avgEngagement = totalEngagement / data.length;
      
      if (avgEngagement === 0) continue;
      
      // Calculate weights relative to average
      const weights: Record<string, number> = {};
      
      for (const d of data) {
        if (!d.formula) continue;
        const engagement = d._avg.engagementRate?.toNumber() || 0;
        // Weight = performance relative to average, bounded 0.5-2.0
        weights[d.formula] = Math.max(0.5, Math.min(2.0, engagement / avgEngagement));
      }
      
      const sampleSize = data.reduce((sum, d) => sum + d._count._all, 0);
      
      // Upsert weights
      await prisma.formulaWeight.upsert({
        where: {
          platform_pillar: { platform, pillar },
        },
        create: {
          platform,
          pillar,
          dataBomb: weights.data_bomb || 1.0,
          toughLove: weights.tough_love || 1.0,
          transformation: weights.transformation || 1.0,
          contrarian: weights.contrarian || 1.0,
          protocol: weights.protocol || 1.0,
          mythBuster: weights.myth_buster || 1.0,
          insiderSecret: weights.insider_secret || 1.0,
          lastCalculatedAt: new Date(),
          sampleSize,
        },
        update: {
          dataBomb: weights.data_bomb || 1.0,
          toughLove: weights.tough_love || 1.0,
          transformation: weights.transformation || 1.0,
          contrarian: weights.contrarian || 1.0,
          protocol: weights.protocol || 1.0,
          mythBuster: weights.myth_buster || 1.0,
          insiderSecret: weights.insider_secret || 1.0,
          lastCalculatedAt: new Date(),
          sampleSize,
        },
      });
      
      updated++;
    }
  }
  
  return updated;
}

/**
 * Update hook weights based on engagement data
 */
export async function updateHookWeights(): Promise<number> {
  const platforms = ["twitter", "facebook", "instagram"];
  const pillars = ["all", "proper_human_diet", "gut_health", "sleep_recovery", "detox_environment", "mental_performance"];
  
  let updated = 0;
  
  for (const platform of platforms) {
    for (const pillar of pillars) {
      const where = {
        platform,
        hookType: { not: null },
        impressions: { gte: 100 },
        ...(pillar !== "all" && { pillar }),
      };
      
      const data = await prisma.postPerformance.groupBy({
        by: ["hookType"],
        where,
        _avg: {
          engagementRate: true,
        },
        _count: {
          _all: true,
        },
      });
      
      if (data.length < 3) continue;
      
      const totalEngagement = data.reduce((sum, d) => 
        sum + (d._avg.engagementRate?.toNumber() || 0), 0);
      const avgEngagement = totalEngagement / data.length;
      
      if (avgEngagement === 0) continue;
      
      const weights: Record<string, number> = {};
      
      for (const d of data) {
        if (!d.hookType) continue;
        const engagement = d._avg.engagementRate?.toNumber() || 0;
        weights[d.hookType] = Math.max(0.5, Math.min(2.0, engagement / avgEngagement));
      }
      
      const sampleSize = data.reduce((sum, d) => sum + d._count._all, 0);
      
      await prisma.hookWeight.upsert({
        where: {
          platform_pillar: { platform, pillar },
        },
        create: {
          platform,
          pillar,
          shockingStat: weights.shocking_stat || 1.0,
          contrarian: weights.contrarian || 1.0,
          challenge: weights.challenge || 1.0,
          curiosityGap: weights.curiosity_gap || 1.0,
          storyTease: weights.story_tease || 1.0,
          directCommand: weights.direct_command || 1.0,
          usVsThem: weights.us_vs_them || 1.0,
          boldPromise: weights.bold_promise || 1.0,
          lastCalculatedAt: new Date(),
          sampleSize,
        },
        update: {
          shockingStat: weights.shocking_stat || 1.0,
          contrarian: weights.contrarian || 1.0,
          challenge: weights.challenge || 1.0,
          curiosityGap: weights.curiosity_gap || 1.0,
          storyTease: weights.story_tease || 1.0,
          directCommand: weights.direct_command || 1.0,
          usVsThem: weights.us_vs_them || 1.0,
          boldPromise: weights.bold_promise || 1.0,
          lastCalculatedAt: new Date(),
          sampleSize,
        },
      });
      
      updated++;
    }
  }
  
  return updated;
}

/**
 * Calculate best posting times from performance data
 */
export async function updateTimingInsights(): Promise<number> {
  const platforms = ["twitter", "facebook", "instagram"];
  
  let updated = 0;
  
  for (const platform of platforms) {
    // Get engagement by day/hour
    const data = await prisma.postPerformance.groupBy({
      by: ["dayOfWeek", "hourOfDay"],
      where: {
        platform,
        impressions: { gte: 50 },
      },
      _avg: {
        engagementRate: true,
      },
      _count: {
        _all: true,
      },
    });
    
    if (data.length < 10) continue;
    
    // Filter to slots with enough data and sort by engagement
    const validSlots = data
      .filter(d => d._count._all >= 2)
      .map(d => ({
        dayOfWeek: d.dayOfWeek,
        hourOfDay: d.hourOfDay,
        avgEngagement: d._avg.engagementRate?.toNumber() || 0,
        sampleSize: d._count._all,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
    
    const bestTimes = validSlots.slice(0, 5);
    const worstTimes = validSlots.slice(-3);
    
    const sampleSize = data.reduce((sum, d) => sum + d._count._all, 0);
    
    await prisma.timingInsight.upsert({
      where: {
        platform_pillar: { platform, pillar: "all" },
      },
      create: {
        platform,
        pillar: "all",
        bestTimes,
        worstTimes,
        lastCalculatedAt: new Date(),
        sampleSize,
      },
      update: {
        bestTimes,
        worstTimes,
        lastCalculatedAt: new Date(),
        sampleSize,
      },
    });
    
    updated++;
  }
  
  return updated;
}

/**
 * Generate human-readable insights from performance data
 */
export async function generateInsights(days: number = 30): Promise<string[]> {
  const insights: string[] = [];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Top performing formula overall
  const topFormulaData = await prisma.postPerformance.groupBy({
    by: ["formula"],
    where: {
      formula: { not: null },
      publishedAt: { gte: startDate },
      performanceLevel: { in: ["excellent", "viral"] },
    },
    _count: { _all: true },
  });
  
  // Sort by count descending and take top
  const topFormula = topFormulaData.sort((a, b) => b._count._all - a._count._all).slice(0, 1);
  
  if (topFormula.length > 0 && topFormula[0].formula) {
    insights.push(`🏆 Top formula: "${topFormula[0].formula.replace(/_/g, " ")}" produces the most excellent/viral posts`);
  }
  
  // Best performing pillar
  const topPillar = await prisma.postPerformance.groupBy({
    by: ["pillar"],
    where: {
      pillar: { not: null },
      publishedAt: { gte: startDate },
    },
    _avg: { engagementRate: true },
    orderBy: { _avg: { engagementRate: "desc" } },
    take: 1,
  });
  
  if (topPillar.length > 0 && topPillar[0].pillar) {
    const avgRate = (topPillar[0]._avg.engagementRate?.toNumber() || 0) * 100;
    insights.push(`🎯 Best pillar: "${topPillar[0].pillar.replace(/_/g, " ")}" averages ${avgRate.toFixed(2)}% engagement`);
  }
  
  // Best day of week
  const bestDay = await prisma.postPerformance.groupBy({
    by: ["dayOfWeek"],
    where: { publishedAt: { gte: startDate } },
    _avg: { engagementRate: true },
    orderBy: { _avg: { engagementRate: "desc" } },
    take: 1,
  });
  
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (bestDay.length > 0) {
    insights.push(`📅 Best day: ${dayNames[bestDay[0].dayOfWeek]} has highest average engagement`);
  }
  
  // Platform comparison
  const platformStats = await prisma.postPerformance.groupBy({
    by: ["platform"],
    where: { publishedAt: { gte: startDate } },
    _avg: { engagementRate: true },
    _count: { _all: true },
  });
  
  platformStats.sort((a, b) => 
    (b._avg.engagementRate?.toNumber() || 0) - (a._avg.engagementRate?.toNumber() || 0)
  );
  
  if (platformStats.length > 1) {
    const best = platformStats[0];
    const bestRate = (best._avg.engagementRate?.toNumber() || 0) * 100;
    insights.push(`📱 Top platform: ${best.platform} (${bestRate.toFixed(2)}% avg engagement across ${best._count._all} posts)`);
  }
  
  // Recent A/B test wins
  const recentWins = await prisma.aBTest.findMany({
    where: {
      status: "completed",
      winningVariant: { not: null },
      completedAt: { gte: startDate },
    },
    orderBy: { completedAt: "desc" },
    take: 3,
  });
  
  for (const test of recentWins) {
    const variantKey = `variant${test.winningVariant}Config` as "variantAConfig" | "variantBConfig" | "variantCConfig";
    const config = test[variantKey] as Record<string, string> | null;
    if (config?.formula) {
      insights.push(`🧪 A/B win: "${config.formula}" beat competitors for ${test.pillar} on ${test.platform}`);
    }
  }
  
  // Underperforming areas
  const lowPerformersData = await prisma.postPerformance.groupBy({
    by: ["formula"],
    where: {
      formula: { not: null },
      publishedAt: { gte: startDate },
      performanceLevel: "poor",
    },
    _count: { _all: true },
  });
  
  // Sort by count descending and take top
  const lowPerformers = lowPerformersData.sort((a, b) => b._count._all - a._count._all).slice(0, 1);
  
  if (lowPerformers.length > 0 && lowPerformers[0]._count._all >= 3) {
    insights.push(`⚠️ Consider avoiding: "${lowPerformers[0].formula?.replace(/_/g, " ")}" has high poor-performance rate`);
  }
  
  return insights;
}

/**
 * Apply A/B test learnings to weights
 */
export async function applyABTestLearnings(testId: string): Promise<boolean> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
  });
  
  if (!test || test.status !== "completed" || !test.winningVariant) {
    return false;
  }
  
  const variantKey = `variant${test.winningVariant}Config` as "variantAConfig" | "variantBConfig" | "variantCConfig";
  const winnerConfig = test[variantKey] as Record<string, string> | null;
  
  if (test.testVariable === "formula" && winnerConfig?.formula) {
    // Boost winning formula weight
    const formulaField = toCamelCase(winnerConfig.formula);
    
    // Get current weight
    const current = await prisma.formulaWeight.findFirst({
      where: {
        platform: test.platform,
        pillar: test.pillar || "all",
      },
    });
    
    if (current) {
      const currentValue = (current as Record<string, unknown>)[formulaField] as { toNumber?: () => number } | number;
      const numValue = typeof currentValue === 'number' ? currentValue : (currentValue?.toNumber?.() || 1.0);
      const newValue = numValue * 1.1; // 10% boost
      
      await prisma.formulaWeight.update({
        where: { id: current.id },
        data: { [formulaField]: newValue },
      });
    }
  }
  
  if (test.testVariable === "hook" && winnerConfig?.hook) {
    const hookField = toCamelCase(winnerConfig.hook);
    
    const current = await prisma.hookWeight.findFirst({
      where: {
        platform: test.platform,
        pillar: test.pillar || "all",
      },
    });
    
    if (current) {
      const currentValue = (current as Record<string, unknown>)[hookField] as { toNumber?: () => number } | number;
      const numValue = typeof currentValue === 'number' ? currentValue : (currentValue?.toNumber?.() || 1.0);
      const newValue = numValue * 1.1; // 10% boost
      
      await prisma.hookWeight.update({
        where: { id: current.id },
        data: { [hookField]: newValue },
      });
    }
  }
  
  return true;
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

