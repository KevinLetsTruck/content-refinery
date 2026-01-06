import prisma from "@/lib/db/prisma";

// Topic keywords for classification
const TOPIC_KEYWORDS: Record<string, string[]> = {
  gut_health: [
    "gut",
    "digestive",
    "microbiome",
    "probiotic",
    "candida",
    "bloating",
    "digestion",
    "fiber",
    "prebiotic",
  ],
  sleep: [
    "sleep",
    "insomnia",
    "circadian",
    "rest",
    "fatigue",
    "tired",
    "melatonin",
    "caffeine",
    "nap",
  ],
  stress: [
    "stress",
    "cortisol",
    "anxiety",
    "relax",
    "burnout",
    "overwhelm",
    "calm",
    "adrenal",
  ],
  nutrition: [
    "eat",
    "food",
    "diet",
    "meal",
    "protein",
    "carb",
    "fat",
    "calorie",
    "nutrient",
    "vitamin",
  ],
  exercise: [
    "exercise",
    "workout",
    "stretch",
    "movement",
    "strength",
    "cardio",
    "resistance",
    "mobility",
  ],
  supplements: [
    "supplement",
    "vitamin",
    "mineral",
    "omega",
    "magnesium",
    "dha",
    "collagen",
  ],
  detox: ["detox", "toxin", "cleanse", "heavy metal", "liver", "kidney"],
  mindset: [
    "mindset",
    "motivation",
    "discipline",
    "habit",
    "routine",
    "consistency",
  ],
  trucking_specific: [
    "cab",
    "truck stop",
    "road",
    "driving",
    "hours of service",
    "dispatch",
    "load",
  ],
};

export interface PerformanceData {
  contentId: string;
  content: string;
  platform: string;
  contentType: string;
  publishedAt: Date;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  topics: string[];
}

/**
 * Classify content topics using keywords
 */
export async function classifyContentTopics(
  contentId: string
): Promise<string[]> {
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
  });

  if (!content?.text) return [];

  const textToAnalyze = (content.text + " " + (content.title || "")).toLowerCase();
  const detectedTopics: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matchCount = keywords.filter((kw) => textToAnalyze.includes(kw)).length;
    if (
      matchCount >= 2 ||
      (matchCount >= 1 && keywords.some((kw) => textToAnalyze.includes(kw) && kw.length > 5))
    ) {
      detectedTopics.push(topic);
    }
  }

  // Store topics
  for (const topic of detectedTopics) {
    await prisma.contentTopic.upsert({
      where: {
        contentId_topic: { contentId, topic },
      },
      create: { contentId, topic },
      update: {},
    });
  }

  return detectedTopics;
}

/**
 * Get performance data for analysis
 */
export async function getPerformanceData(
  days: number = 30
): Promise<PerformanceData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const content = await prisma.generatedContent.findMany({
    where: {
      publishedAt: { gte: startDate },
      status: "published",
    },
    include: {
      performance: true,
      topics: true,
    },
  });

  return content.map((c) => {
    const perf = c.performance;
    const impressions = perf?.impressions || 0;
    const engagement =
      (perf?.likes || 0) + (perf?.comments || 0) + (perf?.shares || 0);

    return {
      contentId: c.id,
      content: c.text || "",
      platform: c.platform,
      contentType: c.contentType || "social_post",
      publishedAt: c.publishedAt!,
      impressions,
      likes: perf?.likes || 0,
      comments: perf?.comments || 0,
      shares: perf?.shares || 0,
      clicks: perf?.clicks || 0,
      engagementRate: impressions > 0 ? (engagement / impressions) * 100 : 0,
      topics: c.topics.map((t) => t.topic),
    };
  });
}

/**
 * Analyze topic performance
 */
export async function analyzeTopicPerformance(
  data: PerformanceData[]
): Promise<
  Record<string, { count: number; avgEngagement: number; totalImpressions: number }>
> {
  const topicStats: Record<
    string,
    { count: number; totalEngagement: number; totalImpressions: number }
  > = {};

  for (const item of data) {
    for (const topic of item.topics) {
      if (!topicStats[topic]) {
        topicStats[topic] = { count: 0, totalEngagement: 0, totalImpressions: 0 };
      }
      topicStats[topic].count++;
      topicStats[topic].totalEngagement += item.engagementRate;
      topicStats[topic].totalImpressions += item.impressions;
    }
  }

  const result: Record<
    string,
    { count: number; avgEngagement: number; totalImpressions: number }
  > = {};
  for (const [topic, stats] of Object.entries(topicStats)) {
    result[topic] = {
      count: stats.count,
      avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
      totalImpressions: stats.totalImpressions,
    };
  }

  return result;
}

/**
 * Analyze posting time performance
 */
export async function analyzeTimingPerformance(
  data: PerformanceData[]
): Promise<{ byHour: Record<number, number>; byDay: Record<number, number> }> {
  const byHour: Record<number, { total: number; count: number }> = {};
  const byDay: Record<number, { total: number; count: number }> = {};

  for (const item of data) {
    const hour = item.publishedAt.getHours();
    const day = item.publishedAt.getDay();

    if (!byHour[hour]) byHour[hour] = { total: 0, count: 0 };
    byHour[hour].total += item.engagementRate;
    byHour[hour].count++;

    if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
    byDay[day].total += item.engagementRate;
    byDay[day].count++;
  }

  return {
    byHour: Object.fromEntries(
      Object.entries(byHour).map(([h, v]) => [h, v.count > 0 ? v.total / v.count : 0])
    ),
    byDay: Object.fromEntries(
      Object.entries(byDay).map(([d, v]) => [d, v.count > 0 ? v.total / v.count : 0])
    ),
  };
}

/**
 * Analyze content format performance
 */
export async function analyzeFormatPerformance(
  data: PerformanceData[]
): Promise<Record<string, { count: number; avgEngagement: number }>> {
  const formatStats: Record<string, { count: number; totalEngagement: number }> = {};

  for (const item of data) {
    const format = item.contentType;
    if (!formatStats[format]) {
      formatStats[format] = { count: 0, totalEngagement: 0 };
    }
    formatStats[format].count++;
    formatStats[format].totalEngagement += item.engagementRate;
  }

  return Object.fromEntries(
    Object.entries(formatStats).map(([format, stats]) => [
      format,
      {
        count: stats.count,
        avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
      },
    ])
  );
}

/**
 * Identify content length patterns
 */
export function analyzeLengthPerformance(
  data: PerformanceData[]
): { short: number; medium: number; long: number } {
  const buckets = {
    short: { total: 0, count: 0 }, // < 100 chars
    medium: { total: 0, count: 0 }, // 100-280 chars
    long: { total: 0, count: 0 }, // > 280 chars
  };

  for (const item of data) {
    const length = item.content.length;
    const bucket: keyof typeof buckets =
      length < 100 ? "short" : length <= 280 ? "medium" : "long";
    buckets[bucket].total += item.engagementRate;
    buckets[bucket].count++;
  }

  return {
    short: buckets.short.count > 0 ? buckets.short.total / buckets.short.count : 0,
    medium: buckets.medium.count > 0 ? buckets.medium.total / buckets.medium.count : 0,
    long: buckets.long.count > 0 ? buckets.long.total / buckets.long.count : 0,
  };
}

/**
 * Find top performing posts
 */
export function getTopPerformers(
  data: PerformanceData[],
  limit: number = 5
): PerformanceData[] {
  return [...data]
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, limit);
}

/**
 * Find underperforming posts
 */
export function getUnderperformers(
  data: PerformanceData[],
  limit: number = 5
): PerformanceData[] {
  const avgEngagement =
    data.reduce((sum, d) => sum + d.engagementRate, 0) / data.length;
  return [...data]
    .filter((d) => d.engagementRate < avgEngagement * 0.5)
    .sort((a, b) => a.engagementRate - b.engagementRate)
    .slice(0, limit);
}

export { TOPIC_KEYWORDS };




