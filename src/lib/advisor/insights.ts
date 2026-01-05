import prisma from "@/lib/db/prisma";
import Anthropic from "@anthropic-ai/sdk";
import {
  getPerformanceData,
  analyzeTopicPerformance,
  analyzeTimingPerformance,
  analyzeFormatPerformance,
  analyzeLengthPerformance,
  getTopPerformers,
  TOPIC_KEYWORDS,
  PerformanceData,
} from "./analyzer";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface InsightData {
  type: string;
  category?: string;
  title: string;
  description: string;
  recommendation: string;
  dataPoints: Record<string, unknown>;
  confidence: number;
  impact: "low" | "medium" | "high";
}

/**
 * Generate all insights
 */
export async function generateInsights(): Promise<{
  created: number;
  insights: InsightData[];
}> {
  const data = await getPerformanceData(30);

  if (data.length < 5) {
    return { created: 0, insights: [] };
  }

  const insights: InsightData[] = [];

  // 1. Topic Performance Insights
  const topicPerf = await analyzeTopicPerformance(data);
  insights.push(...generateTopicInsights(topicPerf, data));

  // 2. Timing Insights
  const timingPerf = await analyzeTimingPerformance(data);
  insights.push(...generateTimingInsights(timingPerf));

  // 3. Format Insights
  const formatPerf = await analyzeFormatPerformance(data);
  insights.push(...generateFormatInsights(formatPerf));

  // 4. Length Insights
  const lengthPerf = analyzeLengthPerformance(data);
  insights.push(...generateLengthInsights(lengthPerf));

  // 5. Top Performers Analysis
  const topPosts = getTopPerformers(data, 3);
  insights.push(...(await generateTopPerformerInsights(topPosts)));

  // 6. Content Gap Analysis
  insights.push(...generateContentGapInsights(topicPerf));

  // 7. Platform-specific insights
  insights.push(...generatePlatformInsights(data));

  // Save insights to database
  const created = await saveInsights(insights);

  return { created, insights };
}

function generateTopicInsights(
  topicPerf: Record<
    string,
    { count: number; avgEngagement: number; totalImpressions: number }
  >,
  data: PerformanceData[]
): InsightData[] {
  const insights: InsightData[] = [];
  const topics = Object.entries(topicPerf);

  if (topics.length === 0) return insights;

  // Find best performing topic
  const sorted = topics.sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);
  const [bestTopic, bestStats] = sorted[0];
  const avgEngagement =
    data.reduce((sum, d) => sum + d.engagementRate, 0) / data.length;

  if (bestStats.avgEngagement > avgEngagement * 1.5) {
    insights.push({
      type: "topic_performance",
      category: bestTopic,
      title: `${formatTopicName(bestTopic)} content is your top performer`,
      description: `Posts about ${formatTopicName(bestTopic).toLowerCase()} get ${(
        (bestStats.avgEngagement / avgEngagement - 1) *
        100
      ).toFixed(0)}% more engagement than your average.`,
      recommendation: `Create more ${formatTopicName(bestTopic).toLowerCase()} content. Consider a dedicated series or campaign on this topic.`,
      dataPoints: {
        topic: bestTopic,
        avgEngagement: bestStats.avgEngagement.toFixed(2),
        postCount: bestStats.count,
        vsAverage: `+${((bestStats.avgEngagement / avgEngagement - 1) * 100).toFixed(0)}%`,
      },
      confidence: Math.min(0.9, 0.5 + bestStats.count * 0.05),
      impact: "high",
    });
  }

  // Find underperforming topic
  if (sorted.length > 1) {
    const [worstTopic, worstStats] = sorted[sorted.length - 1];
    if (worstStats.count >= 3 && worstStats.avgEngagement < avgEngagement * 0.7) {
      insights.push({
        type: "topic_performance",
        category: worstTopic,
        title: `${formatTopicName(worstTopic)} content underperforms`,
        description: `Posts about ${formatTopicName(worstTopic).toLowerCase()} get ${(
          (1 - worstStats.avgEngagement / avgEngagement) *
          100
        ).toFixed(0)}% less engagement than average.`,
        recommendation: `Consider refreshing your ${formatTopicName(worstTopic).toLowerCase()} content approach. Try different angles, formats, or hooks.`,
        dataPoints: {
          topic: worstTopic,
          avgEngagement: worstStats.avgEngagement.toFixed(2),
          postCount: worstStats.count,
          vsAverage: `-${((1 - worstStats.avgEngagement / avgEngagement) * 100).toFixed(0)}%`,
        },
        confidence: Math.min(0.8, 0.4 + worstStats.count * 0.05),
        impact: "medium",
      });
    }
  }

  return insights;
}

function generateTimingInsights(timingPerf: {
  byHour: Record<number, number>;
  byDay: Record<number, number>;
}): InsightData[] {
  const insights: InsightData[] = [];
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Best posting hour
  const hours = Object.entries(timingPerf.byHour);
  if (hours.length > 0) {
    const bestHour = hours.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const hourNum = parseInt(bestHour[0]);
    const timeStr =
      hourNum === 0
        ? "12 AM"
        : hourNum < 12
          ? `${hourNum} AM`
          : hourNum === 12
            ? "12 PM"
            : `${hourNum - 12} PM`;

    insights.push({
      type: "timing",
      title: `Your posts perform best around ${timeStr}`,
      description: `Content posted around ${timeStr} gets significantly higher engagement. This aligns with when drivers typically take breaks.`,
      recommendation: `Schedule your most important content between ${timeStr} and ${((hourNum + 2) % 12 || 12)} ${hourNum + 2 >= 12 && hourNum + 2 < 24 ? "PM" : "AM"}.`,
      dataPoints: {
        bestHour: hourNum,
        engagement: Number(bestHour[1]).toFixed(2),
        allHours: timingPerf.byHour,
      },
      confidence: 0.7,
      impact: "medium",
    });
  }

  // Best posting day
  const days = Object.entries(timingPerf.byDay);
  if (days.length > 0) {
    const bestDay = days.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const dayNum = parseInt(bestDay[0]);

    insights.push({
      type: "timing",
      title: `${dayNames[dayNum]} is your best posting day`,
      description: `Posts on ${dayNames[dayNum]} consistently outperform other days of the week.`,
      recommendation: `Prioritize your highest-quality content for ${dayNames[dayNum]}s. Consider posting evergreen content on lower-performing days.`,
      dataPoints: {
        bestDay: dayNum,
        dayName: dayNames[dayNum],
        engagement: Number(bestDay[1]).toFixed(2),
        allDays: Object.fromEntries(
          Object.entries(timingPerf.byDay).map(([d, v]) => [
            dayNames[parseInt(d)],
            Number(v).toFixed(2),
          ])
        ),
      },
      confidence: 0.65,
      impact: "medium",
    });
  }

  return insights;
}

function generateFormatInsights(
  formatPerf: Record<string, { count: number; avgEngagement: number }>
): InsightData[] {
  const insights: InsightData[] = [];
  const formats = Object.entries(formatPerf);

  if (formats.length < 2) return insights;

  const sorted = formats.sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);
  const [bestFormat, bestStats] = sorted[0];

  insights.push({
    type: "format",
    title: `${formatContentType(bestFormat)} format drives highest engagement`,
    description: `Your ${formatContentType(bestFormat).toLowerCase()} content outperforms other formats with ${bestStats.avgEngagement.toFixed(1)}% average engagement.`,
    recommendation: `Create more ${formatContentType(bestFormat).toLowerCase()} content, especially for your high-performing topics.`,
    dataPoints: {
      bestFormat,
      avgEngagement: bestStats.avgEngagement.toFixed(2),
      count: bestStats.count,
      allFormats: Object.fromEntries(
        formats.map(([f, s]) => [
          f,
          { count: s.count, engagement: s.avgEngagement.toFixed(2) },
        ])
      ),
    },
    confidence: 0.7,
    impact: "medium",
  });

  return insights;
}

function generateLengthInsights(lengthPerf: {
  short: number;
  medium: number;
  long: number;
}): InsightData[] {
  const insights: InsightData[] = [];

  const lengths = [
    { name: "short", value: lengthPerf.short, desc: "Short posts (< 100 chars)" },
    {
      name: "medium",
      value: lengthPerf.medium,
      desc: "Medium posts (100-280 chars)",
    },
    { name: "long", value: lengthPerf.long, desc: "Long posts (> 280 chars)" },
  ];

  const best = lengths.sort((a, b) => b.value - a.value)[0];

  if (best.value > 0) {
    insights.push({
      type: "format",
      title: `${best.desc} perform best`,
      description: `${best.desc} get the highest engagement at ${best.value.toFixed(1)}% average.`,
      recommendation:
        best.name === "short"
          ? "Keep your messages punchy and direct. Drivers don't have time for walls of text."
          : best.name === "medium"
            ? "Your sweet spot is medium-length posts. Enough detail to be valuable, short enough to consume quickly."
            : "Your audience appreciates detailed content. Consider creating more in-depth posts and threads.",
      dataPoints: lengthPerf,
      confidence: 0.6,
      impact: "low",
    });
  }

  return insights;
}

async function generateTopPerformerInsights(
  topPosts: PerformanceData[]
): Promise<InsightData[]> {
  if (topPosts.length === 0) return [];

  // Use AI to analyze what made these posts successful
  const postsText = topPosts
    .map(
      (p, i) =>
        `${i + 1}. (${p.engagementRate.toFixed(1)}% engagement): "${p.content.substring(0, 200)}..."`
    )
    .join("\n");

  const prompt = `Analyze these top-performing social media posts for a health coaching brand targeting professional truck drivers. What patterns make them successful?

${postsText}

Provide a brief analysis (2-3 sentences) identifying the common success factors, then one actionable recommendation.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content[0];
    const analysis = textBlock.type === "text" ? textBlock.text : "";
    const lines = analysis.split("\n");

    return [
      {
        type: "engagement_pattern",
        title: "What makes your top posts work",
        description: lines[0] || analysis.substring(0, 200),
        recommendation:
          lines.slice(1).join(" ").trim() ||
          "Continue creating content with these successful elements.",
        dataPoints: {
          topPosts: topPosts.map((p) => ({
            content: p.content.substring(0, 100),
            engagement: p.engagementRate.toFixed(2),
          })),
        },
        confidence: 0.75,
        impact: "high",
      },
    ];
  } catch (error) {
    console.error("Failed to generate top performer insights:", error);
    return [];
  }
}

function generateContentGapInsights(
  topicPerf: Record<
    string,
    { count: number; avgEngagement: number; totalImpressions: number }
  >
): InsightData[] {
  const insights: InsightData[] = [];
  const allTopics = Object.keys(TOPIC_KEYWORDS);
  const coveredTopics = Object.keys(topicPerf);
  const missingTopics = allTopics.filter((t) => !coveredTopics.includes(t));

  if (missingTopics.length > 0) {
    const topMissing = missingTopics.slice(0, 3);
    insights.push({
      type: "content_gap",
      title: "Content gaps to explore",
      description: `You haven't posted much about ${topMissing.map(formatTopicName).join(", ")} recently. These could be opportunities for new content.`,
      recommendation: `Test content about ${formatTopicName(topMissing[0])} - it's relevant to your audience and you haven't explored it much.`,
      dataPoints: {
        missingTopics: topMissing,
        coveredTopics,
      },
      confidence: 0.5,
      impact: "low",
    });
  }

  return insights;
}

function generatePlatformInsights(data: PerformanceData[]): InsightData[] {
  const insights: InsightData[] = [];

  const platformStats: Record<
    string,
    { count: number; totalEngagement: number }
  > = {};

  for (const item of data) {
    if (!platformStats[item.platform]) {
      platformStats[item.platform] = { count: 0, totalEngagement: 0 };
    }
    platformStats[item.platform].count++;
    platformStats[item.platform].totalEngagement += item.engagementRate;
  }

  const platforms = Object.entries(platformStats);
  if (platforms.length < 2) return insights;

  const sorted = platforms
    .map(([p, s]) => ({
      platform: p,
      count: s.count,
      avg: s.totalEngagement / s.count,
    }))
    .sort((a, b) => b.avg - a.avg);

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (best.avg > worst.avg * 1.5) {
    insights.push({
      type: "platform",
      title: `${formatPlatform(best.platform)} significantly outperforms ${formatPlatform(worst.platform)}`,
      description: `Your ${formatPlatform(best.platform)} content gets ${((best.avg / worst.avg - 1) * 100).toFixed(0)}% more engagement than ${formatPlatform(worst.platform)}.`,
      recommendation: `Consider focusing more energy on ${formatPlatform(best.platform)} or adapting your ${formatPlatform(worst.platform)} strategy to match what works.`,
      dataPoints: { platforms: sorted },
      confidence: 0.7,
      impact: "medium",
    });
  }

  return insights;
}

async function saveInsights(insights: InsightData[]): Promise<number> {
  let created = 0;

  for (const insight of insights) {
    // Check for duplicate recent insights
    const existing = await prisma.contentInsight.findFirst({
      where: {
        type: insight.type,
        category: insight.category,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (!existing) {
      await prisma.contentInsight.create({
        data: {
          insightType: insight.type, // Required field
          type: insight.type,
          category: insight.category,
          title: insight.title,
          description: insight.description,
          recommendation: insight.recommendation,
          dataPoints: insight.dataPoints as unknown as object,
          confidence: insight.confidence,
          impact: insight.impact,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        },
      });
      created++;
    }
  }

  return created;
}

// Helper functions
function formatTopicName(topic: string): string {
  return topic
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatContentType(type: string): string {
  const names: Record<string, string> = {
    social_post: "Social Post",
    thread: "Thread",
    carousel: "Carousel",
    video_script: "Video",
    document: "Document",
    presentation: "Presentation",
  };
  return names[type] || type;
}

function formatPlatform(platform: string): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

