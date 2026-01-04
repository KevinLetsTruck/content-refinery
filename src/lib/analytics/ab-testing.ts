import prisma from "@/lib/db/prisma";
import {
  ContentFormula,
  ContentPillar,
  Platform,
  BusinessObjective,
} from "@/lib/content/strategy";

export interface ABTestConfig {
  name?: string;
  extractionId: string;
  sourceText: string;
  platform: Platform;
  pillar: ContentPillar;
  objective: BusinessObjective;
  testVariable: "formula" | "hook" | "cta";
  numVariants?: 2 | 3;
}

export interface GeneratedVariant {
  variant: "A" | "B" | "C";
  config: {
    formula?: string;
    hook?: string;
    cta?: string;
  };
  content: {
    text: string;
    hashtags: string[];
  };
}

export interface ABTestResult {
  testId: string;
  variants: GeneratedVariant[];
}

export interface ABTestMetrics {
  avgEngagement: number;
  totalImpressions: number;
  totalLikes: number;
  totalShares: number;
  postCount: number;
}

/**
 * Create an A/B test with multiple content variants
 */
export async function createABTest(config: ABTestConfig): Promise<ABTestResult> {
  const numVariants = config.numVariants || 2;
  const variants: GeneratedVariant[] = [];
  const variantLabels: ("A" | "B" | "C")[] = ["A", "B", "C"];
  
  // Determine what to vary
  let variantConfigs: { formula?: string; hook?: string; cta?: string }[] = [];
  
  switch (config.testVariable) {
    case "formula":
      // Get formulas to test (prioritize by current weights)
      const topFormulas = await getTopFormulas(config.platform, config.pillar);
      variantConfigs = topFormulas.slice(0, numVariants).map(f => ({ formula: f }));
      break;
      
    case "hook":
      const topHooks = await getTopHooks(config.platform, config.pillar);
      variantConfigs = topHooks.slice(0, numVariants).map(h => ({ hook: h }));
      break;
      
    case "cta":
      variantConfigs = [
        { cta: "email_list" },
        { cta: "coaching" },
        { cta: "audience_growth" },
      ].slice(0, numVariants);
      break;
  }
  
  // Generate content for each variant
  for (let i = 0; i < variantConfigs.length; i++) {
    const variantConfig = variantConfigs[i];
    
    // Import and use generateStrategicContent
    const { generateStrategicContent } = await import("@/lib/ai/claude");
    
    const generated = await generateStrategicContent({
      sourceText: config.sourceText,
      platform: config.platform,
      pillar: config.pillar,
      formula: (variantConfig.formula || "data_bomb") as ContentFormula,
      objective: config.objective,
    });
    
    variants.push({
      variant: variantLabels[i],
      config: variantConfig,
      content: {
        text: generated.text,
        hashtags: generated.hashtags,
      },
    });
  }
  
  // Create A/B test record in database
  const abTest = await prisma.aBTest.create({
    data: {
      name: config.name || `${config.pillar} ${config.testVariable} test - ${new Date().toLocaleDateString()}`,
      extractionId: config.extractionId,
      testVariable: config.testVariable,
      platform: config.platform,
      pillar: config.pillar,
      variantAConfig: variantConfigs[0] || {},
      variantBConfig: variantConfigs[1] || {},
      variantCConfig: variantConfigs[2] || null,
      status: "draft",
    },
  });
  
  return {
    testId: abTest.id,
    variants,
  };
}

/**
 * Start an A/B test (mark as running)
 */
export async function startABTest(testId: string): Promise<void> {
  await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: "running",
      startedAt: new Date(),
    },
  });
}

/**
 * Link a published post to an A/B test
 */
export async function linkPostToTest(
  generatedContentId: string,
  testId: string,
  variant: "A" | "B" | "C"
): Promise<void> {
  await prisma.postPerformance.updateMany({
    where: { generatedContentId },
    data: {
      abTestId: testId,
      variant,
    },
  });
}

/**
 * Analyze A/B test results
 */
export async function analyzeABTest(testId: string): Promise<{
  status: string;
  winner: string | null;
  confidence: number;
  lift: number;
  metrics: Record<string, ABTestMetrics>;
  insights: string[];
  ready: boolean;
}> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      posts: true,
    },
  });
  
  if (!test) {
    throw new Error("A/B test not found");
  }
  
  // Group posts by variant
  const postsByVariant: Record<string, typeof test.posts> = {
    A: test.posts.filter(p => p.variant === "A"),
    B: test.posts.filter(p => p.variant === "B"),
    C: test.posts.filter(p => p.variant === "C"),
  };
  
  // Calculate metrics per variant
  const metrics: Record<string, ABTestMetrics> = {};
  
  for (const [variant, posts] of Object.entries(postsByVariant)) {
    if (posts.length === 0) continue;
    
    const totalEngagement = posts.reduce((sum, p) => sum + p.engagementRate.toNumber(), 0);
    const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);
    
    metrics[variant] = {
      avgEngagement: totalEngagement / posts.length,
      totalImpressions,
      totalLikes,
      totalShares,
      postCount: posts.length,
    };
  }
  
  // Determine winner
  const validVariants = Object.entries(metrics)
    .filter(([, m]) => m.postCount >= 1) // Need at least 1 post
    .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);
  
  if (validVariants.length < 2) {
    return {
      status: test.status,
      winner: null,
      confidence: 0,
      lift: 0,
      metrics,
      insights: ["Not enough data yet. Need posts from at least 2 variants."],
      ready: false,
    };
  }
  
  const [winnerEntry, runnerUpEntry] = validVariants;
  const winner = winnerEntry[0];
  const winnerMetrics = winnerEntry[1];
  const runnerUpMetrics = runnerUpEntry[1];
  
  // Calculate lift (improvement %)
  const lift = runnerUpMetrics.avgEngagement > 0
    ? ((winnerMetrics.avgEngagement - runnerUpMetrics.avgEngagement) / runnerUpMetrics.avgEngagement) * 100
    : 0;
  
  // Calculate statistical confidence (simplified)
  const minSamplesPerVariant = Math.min(...Object.values(metrics).map(m => m.postCount));
  
  // Confidence increases with sample size and effect size
  let confidence = 0;
  if (minSamplesPerVariant >= 3 && Math.abs(lift) > 10) {
    confidence = Math.min(0.95, 0.5 + (minSamplesPerVariant * 0.05) + (Math.abs(lift) / 100));
  } else if (minSamplesPerVariant >= 2) {
    confidence = Math.min(0.8, 0.3 + (minSamplesPerVariant * 0.1));
  }
  
  // Generate insights
  const insights: string[] = [];
  
  if (confidence >= 0.8) {
    insights.push(`🏆 Variant ${winner} wins with ${lift.toFixed(1)}% higher engagement`);
    
    const variantKey = `variant${winner}Config` as "variantAConfig" | "variantBConfig" | "variantCConfig";
    const winnerConfig = test[variantKey] as Record<string, string> | null;
    if (winnerConfig?.formula) {
      insights.push(`✅ Recommended: Use "${winnerConfig.formula}" formula for ${test.pillar} content on ${test.platform}`);
    }
    if (winnerConfig?.hook) {
      insights.push(`✅ Recommended: Use "${winnerConfig.hook}" hooks for ${test.pillar} content`);
    }
  } else if (confidence >= 0.5) {
    insights.push(`📊 Variant ${winner} is leading (+${lift.toFixed(1)}%), but need more data for confidence`);
    insights.push(`📈 Current confidence: ${(confidence * 100).toFixed(0)}% - need 80% to declare winner`);
  } else {
    insights.push(`⏳ Too early to determine winner. Keep publishing variants.`);
  }
  
  // Check if test is complete
  const ready = confidence >= 0.8;
  
  // Update test record if ready
  if (ready && test.status === "running") {
    await prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: "completed",
        completedAt: new Date(),
        winningVariant: winner,
        confidenceLevel: confidence,
        liftPercentage: lift,
        variantAMetrics: metrics.A ? JSON.parse(JSON.stringify(metrics.A)) : null,
        variantBMetrics: metrics.B ? JSON.parse(JSON.stringify(metrics.B)) : null,
        variantCMetrics: metrics.C ? JSON.parse(JSON.stringify(metrics.C)) : null,
      },
    });
  }
  
  return {
    status: ready ? "completed" : test.status,
    winner: ready ? winner : null,
    confidence,
    lift,
    metrics,
    insights,
    ready,
  };
}

/**
 * Get top performing formulas by weight
 */
async function getTopFormulas(platform: Platform, pillar?: ContentPillar): Promise<string[]> {
  const weights = await prisma.formulaWeight.findFirst({
    where: {
      platform,
      pillar: pillar || "all",
    },
  });
  
  const defaultOrder = [
    "data_bomb",
    "tough_love", 
    "transformation",
    "contrarian",
    "protocol",
    "myth_buster",
    "insider_secret",
  ];
  
  if (!weights) {
    // Return with some randomization for exploration
    return shuffleArray(defaultOrder);
  }
  
  // Sort by weight descending
  const formulaScores = [
    { formula: "data_bomb", weight: weights.dataBomb.toNumber() },
    { formula: "tough_love", weight: weights.toughLove.toNumber() },
    { formula: "transformation", weight: weights.transformation.toNumber() },
    { formula: "contrarian", weight: weights.contrarian.toNumber() },
    { formula: "protocol", weight: weights.protocol.toNumber() },
    { formula: "myth_buster", weight: weights.mythBuster.toNumber() },
    { formula: "insider_secret", weight: weights.insiderSecret.toNumber() },
  ];
  
  formulaScores.sort((a, b) => b.weight - a.weight);
  
  // Add some randomization to avoid always testing same formulas
  const top = formulaScores.slice(0, 3);
  const others = shuffleArray(formulaScores.slice(3));
  
  return [...top, ...others].map(f => f.formula);
}

/**
 * Get top performing hooks by weight
 */
async function getTopHooks(platform: Platform, pillar?: ContentPillar): Promise<string[]> {
  const weights = await prisma.hookWeight.findFirst({
    where: {
      platform,
      pillar: pillar || "all",
    },
  });
  
  const defaultOrder = [
    "shocking_stat",
    "contrarian",
    "challenge",
    "curiosity_gap",
    "story_tease",
    "direct_command",
    "us_vs_them",
    "bold_promise",
  ];
  
  if (!weights) {
    return shuffleArray(defaultOrder);
  }
  
  const hookScores = [
    { hook: "shocking_stat", weight: weights.shockingStat.toNumber() },
    { hook: "contrarian", weight: weights.contrarian.toNumber() },
    { hook: "challenge", weight: weights.challenge.toNumber() },
    { hook: "curiosity_gap", weight: weights.curiosityGap.toNumber() },
    { hook: "story_tease", weight: weights.storyTease.toNumber() },
    { hook: "direct_command", weight: weights.directCommand.toNumber() },
    { hook: "us_vs_them", weight: weights.usVsThem.toNumber() },
    { hook: "bold_promise", weight: weights.boldPromise.toNumber() },
  ];
  
  hookScores.sort((a, b) => b.weight - a.weight);
  
  return hookScores.map(h => h.hook);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

