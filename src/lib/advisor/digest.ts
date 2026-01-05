import prisma from "@/lib/db/prisma";
import Anthropic from "@anthropic-ai/sdk";
import {
  getPerformanceData,
  analyzeTopicPerformance,
  getTopPerformers,
  PerformanceData,
} from "./analyzer";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Generate weekly content advisor digest
 */
export async function generateWeeklyDigest(): Promise<{
  id: string;
  weekStart: Date;
  weekEnd: Date;
  postsAnalyzed: number;
  totalEngagement: number;
  topTopic: string | null;
  topFormat: string | null;
  summary: string;
  highlights: string[];
  improvements: string[];
  nextWeekPlan: unknown[];
} | null> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  // Check if digest already exists
  const existing = await prisma.advisorDigest.findUnique({
    where: { weekStart },
  });

  if (existing) {
    return {
      ...existing,
      highlights: existing.highlights as string[],
      improvements: existing.improvements as string[],
      nextWeekPlan: existing.nextWeekPlan as unknown[],
    };
  }

  // Get performance data for the week
  const data = await getPerformanceData(7);

  if (data.length === 0) {
    return null;
  }

  const topicPerf = await analyzeTopicPerformance(data);
  const topPosts = getTopPerformers(data, 3);

  // Calculate totals
  const totalEngagement = data.reduce(
    (sum, d) => sum + d.likes + d.comments + d.shares,
    0
  );

  // Find top topic and format
  const topTopic =
    Object.entries(topicPerf).sort(
      (a, b) => b[1].avgEngagement - a[1].avgEngagement
    )[0]?.[0] || null;

  const formatCounts: Record<string, number> = {};
  data.forEach((d) => {
    formatCounts[d.contentType] = (formatCounts[d.contentType] || 0) + 1;
  });
  const topFormat =
    Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Generate AI summary
  const summary = await generateAISummary(data, topicPerf, topPosts);

  // Generate next week plan
  const nextWeekPlan = await generateNextWeekPlan(topicPerf);

  // Create digest
  const digest = await prisma.advisorDigest.create({
    data: {
      weekStart,
      weekEnd,
      postsAnalyzed: data.length,
      totalEngagement,
      topTopic,
      topFormat,
      summary: summary.summary,
      highlights: summary.highlights as unknown as object,
      improvements: summary.improvements as unknown as object,
      nextWeekPlan: nextWeekPlan as unknown as object,
    },
  });

  return {
    ...digest,
    highlights: digest.highlights as string[],
    improvements: digest.improvements as string[],
    nextWeekPlan: digest.nextWeekPlan as unknown[],
  };
}

async function generateAISummary(
  data: PerformanceData[],
  topicPerf: Record<
    string,
    { count: number; avgEngagement: number; totalImpressions: number }
  >,
  topPosts: PerformanceData[]
): Promise<{ summary: string; highlights: string[]; improvements: string[] }> {
  const totalPosts = data.length;
  const avgEngagement =
    data.reduce((sum, d) => sum + d.engagementRate, 0) / totalPosts;
  const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);

  const prompt = `You are the AI Content Advisor for Let's Truck, a health coaching brand for professional truck drivers.

Here's this week's content performance:
- Posts published: ${totalPosts}
- Total impressions: ${totalImpressions.toLocaleString()}
- Average engagement rate: ${avgEngagement.toFixed(2)}%

Top performing topics: ${Object.entries(topicPerf)
    .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)
    .slice(0, 3)
    .map(([topic, stats]) => `${topic} (${stats.avgEngagement.toFixed(1)}% avg)`)
    .join(", ")}

Top posts this week:
${topPosts.map((p, i) => `${i + 1}. "${p.content.substring(0, 100)}..." - ${p.engagementRate.toFixed(1)}% engagement`).join("\n")}

Provide:
1. A 2-3 sentence summary of the week's performance
2. 3 highlights (wins)
3. 2 areas for improvement

Format as JSON:
{
  "summary": "...",
  "highlights": ["...", "...", "..."],
  "improvements": ["...", "..."]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content[0];
    const text = textBlock.type === "text" ? textBlock.text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
  }

  return {
    summary: `Published ${totalPosts} posts with ${avgEngagement.toFixed(1)}% average engagement.`,
    highlights: [
      "Content was published consistently",
      "Engagement remained stable",
    ],
    improvements: [
      "Try new content formats",
      "Test different posting times",
    ],
  };
}

async function generateNextWeekPlan(
  topicPerf: Record<
    string,
    { count: number; avgEngagement: number; totalImpressions: number }
  >
): Promise<unknown[]> {
  const topTopics = Object.entries(topicPerf)
    .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)
    .slice(0, 3)
    .map(([topic]) => topic);

  const prompt = `Based on content performance data, suggest a content plan for next week for Let's Truck (health coaching for truck drivers).

Top performing topics: ${topTopics.join(", ") || "general health"}

Suggest 5 specific content ideas that would likely perform well. For each, include:
- Topic
- Content type (social post, thread, carousel, video)
- Brief description
- Best day/time to post

Format as JSON array:
[
  {
    "topic": "...",
    "type": "...",
    "description": "...",
    "suggestedDay": "...",
    "suggestedTime": "..."
  }
]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content[0];
    const text = textBlock.type === "text" ? textBlock.text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to generate next week plan:", error);
  }

  return [
    {
      topic: topTopics[0] || "gut_health",
      type: "social_post",
      description: "Share a quick tip about the topic",
      suggestedDay: "Monday",
      suggestedTime: "9:00 AM",
    },
  ];
}

