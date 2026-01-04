import prisma from "@/lib/db/prisma";
import { 
  ContentFormula, 
  ContentPillar,
  Platform,
  BusinessObjective,
} from "@/lib/content/strategy";
import { generateStrategicContent } from "./claude";

interface SmartGenerationRequest {
  sourceText: string;
  platform: Platform;
  pillar: ContentPillar;
  objective: BusinessObjective;
  forceFormula?: ContentFormula;
}

interface SmartGenerationResult {
  text: string;
  hashtags: string[];
  cta: string;
  selectedFormula: ContentFormula;
  recommendedTiming: { dayOfWeek: number; hourOfDay: number } | null;
  confidence: {
    formulaWeight: number;
    sampleSize: number;
  };
}

/**
 * Generate content using learned weights
 * Automatically selects best-performing formulas and hooks
 */
export async function generateSmartContent(
  request: SmartGenerationRequest
): Promise<SmartGenerationResult> {
  // Get formula weights
  const formulaWeights = await prisma.formulaWeight.findFirst({
    where: {
      platform: request.platform,
      OR: [
        { pillar: request.pillar },
        { pillar: "all" },
      ],
    },
    orderBy: { pillar: "desc" }, // Prefer specific pillar over "all"
  });
  
  // Get timing insights
  const timing = await prisma.timingInsight.findFirst({
    where: {
      platform: request.platform,
      OR: [
        { pillar: request.pillar },
        { pillar: "all" },
      ],
    },
    orderBy: { pillar: "desc" },
  });
  
  // Select formula using weighted random selection
  const formula = request.forceFormula || selectWeightedFormula(formulaWeights);
  
  // Get the weight for confidence reporting
  const formulaWeight = formulaWeights
    ? getFormulaWeight(formulaWeights, formula)
    : 1.0;
  
  // Generate content
  const content = await generateStrategicContent({
    sourceText: request.sourceText,
    platform: request.platform,
    pillar: request.pillar,
    formula,
    objective: request.objective,
  });
  
  // Get best posting time
  const bestTimes = timing?.bestTimes as Array<{
    dayOfWeek: number;
    hourOfDay: number;
    avgEngagement: number;
  }> | null;
  
  return {
    text: content.text,
    hashtags: content.hashtags,
    cta: content.cta,
    selectedFormula: formula,
    recommendedTiming: bestTimes?.[0] || null,
    confidence: {
      formulaWeight,
      sampleSize: formulaWeights?.sampleSize || 0,
    },
  };
}

interface FormulaWeights {
  dataBomb: { toNumber: () => number } | number;
  toughLove: { toNumber: () => number } | number;
  transformation: { toNumber: () => number } | number;
  contrarian: { toNumber: () => number } | number;
  protocol: { toNumber: () => number } | number;
  mythBuster: { toNumber: () => number } | number;
  insiderSecret: { toNumber: () => number } | number;
}

function getWeight(value: { toNumber: () => number } | number | null | undefined): number {
  if (value === null || value === undefined) return 1.0;
  if (typeof value === 'number') return value;
  return value.toNumber?.() || 1.0;
}

/**
 * Select formula using weighted probability
 * Higher weights = more likely to be selected
 * But still allows exploration of lower-weight formulas
 */
function selectWeightedFormula(weights: FormulaWeights | null): ContentFormula {
  const formulas: { formula: ContentFormula; weight: number }[] = [
    { formula: "data_bomb", weight: getWeight(weights?.dataBomb) },
    { formula: "tough_love", weight: getWeight(weights?.toughLove) },
    { formula: "transformation", weight: getWeight(weights?.transformation) },
    { formula: "contrarian", weight: getWeight(weights?.contrarian) },
    { formula: "protocol", weight: getWeight(weights?.protocol) },
    { formula: "myth_buster", weight: getWeight(weights?.mythBuster) },
    { formula: "insider_secret", weight: getWeight(weights?.insiderSecret) },
  ];
  
  // Weighted random selection
  const totalWeight = formulas.reduce((sum, f) => sum + f.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const f of formulas) {
    random -= f.weight;
    if (random <= 0) return f.formula;
  }
  
  return "data_bomb"; // Fallback
}

function getFormulaWeight(weights: FormulaWeights | null, formula: ContentFormula): number {
  if (!weights) return 1.0;
  
  const map: Record<ContentFormula, keyof FormulaWeights> = {
    data_bomb: "dataBomb",
    tough_love: "toughLove",
    transformation: "transformation",
    contrarian: "contrarian",
    protocol: "protocol",
    myth_buster: "mythBuster",
    insider_secret: "insiderSecret",
  };
  
  const field = map[formula];
  return getWeight(weights[field]);
}

/**
 * Get recommendations for content creation
 */
export async function getContentRecommendations(
  platform: Platform,
  pillar?: ContentPillar
): Promise<{
  topFormulas: string[];
  topHooks: string[];
  bestTimes: Array<{ day: string; hour: string; engagement: number }>;
  insights: string[];
}> {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Get weights
  const formulaWeights = await prisma.formulaWeight.findFirst({
    where: {
      platform,
      ...(pillar && { pillar }),
    },
  });
  
  const hookWeights = await prisma.hookWeight.findFirst({
    where: {
      platform,
      ...(pillar && { pillar }),
    },
  });
  
  const timing = await prisma.timingInsight.findFirst({
    where: {
      platform,
      ...(pillar && { pillar }),
    },
  });
  
  // Sort formulas by weight
  const formulas = [
    { name: "Data Bomb", weight: getWeight(formulaWeights?.dataBomb) },
    { name: "Tough Love", weight: getWeight(formulaWeights?.toughLove) },
    { name: "Transformation", weight: getWeight(formulaWeights?.transformation) },
    { name: "Contrarian", weight: getWeight(formulaWeights?.contrarian) },
    { name: "Protocol", weight: getWeight(formulaWeights?.protocol) },
    { name: "Myth Buster", weight: getWeight(formulaWeights?.mythBuster) },
    { name: "Insider Secret", weight: getWeight(formulaWeights?.insiderSecret) },
  ].sort((a, b) => b.weight - a.weight);
  
  const hooks = [
    { name: "Shocking Stat", weight: getWeight(hookWeights?.shockingStat) },
    { name: "Contrarian", weight: getWeight(hookWeights?.contrarian) },
    { name: "Challenge", weight: getWeight(hookWeights?.challenge) },
    { name: "Curiosity Gap", weight: getWeight(hookWeights?.curiosityGap) },
    { name: "Story Tease", weight: getWeight(hookWeights?.storyTease) },
    { name: "Direct Command", weight: getWeight(hookWeights?.directCommand) },
    { name: "Us vs Them", weight: getWeight(hookWeights?.usVsThem) },
    { name: "Bold Promise", weight: getWeight(hookWeights?.boldPromise) },
  ].sort((a, b) => b.weight - a.weight);
  
  // Format best times
  const bestTimesRaw = timing?.bestTimes as Array<{
    dayOfWeek: number;
    hourOfDay: number;
    avgEngagement: number;
  }> || [];
  
  const bestTimes = bestTimesRaw.map(t => ({
    day: dayNames[t.dayOfWeek],
    hour: `${t.hourOfDay}:00`,
    engagement: t.avgEngagement * 100,
  }));
  
  // Generate insights
  const { generateInsights } = await import("@/lib/analytics/learning-engine");
  const insights = await generateInsights();
  
  return {
    topFormulas: formulas.slice(0, 3).map(f => f.name),
    topHooks: hooks.slice(0, 3).map(h => h.name),
    bestTimes: bestTimes.slice(0, 3),
    insights,
  };
}

