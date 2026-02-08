/**
 * AI Community Advisor
 *
 * Uses Claude to analyze Mighty Networks community data and
 * generate actionable growth recommendations for Kevin.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { CommunityStats, CommunityInsight } from "./types";

/**
 * Generate AI-powered community growth insights
 *
 * Sends community stats to Claude and gets back 3-5 actionable
 * recommendations for growing The Tribe.
 */
export async function generateCommunityInsights(
  stats: CommunityStats
): Promise<CommunityInsight[]> {
  const anthropic = new Anthropic();

  const prompt = `You are Kevin Rutherford's community growth advisor for The Tribe (Let's Truck community on Mighty Networks at letstrucktribe.com). Analyze these community metrics and provide 3-5 actionable insights.

COMMUNITY DATA:
${JSON.stringify(stats, null, 2)}

CONTEXT:
- The Tribe serves professional truck drivers focused on health and wellness
- Kevin hosts radio shows, sells supplements, and offers health coaching
- The community is on Mighty Networks (MN) platform
- Revenue comes from MN subscriptions (monthly/annual plans)
- Kevin's voice is direct, no-BS, action-oriented

RULES:
- Be specific with numbers — reference the actual data
- Each insight should have a clear, actionable recommendation
- Focus on growth levers Kevin can actually pull
- Don't be generic — tie recommendations to the trucking/health niche
- If churn is high, explain WHY and HOW to fix it
- If growth is low, suggest specific engagement tactics
- Consider: member onboarding, content cadence, ambassador programs, pricing
- Use "drivers" not "truckers" — Kevin's rule

Return ONLY valid JSON array with this exact structure:
[
  {
    "id": "1",
    "type": "growth|retention|revenue|engagement|opportunity",
    "title": "Short punchy title (5-10 words)",
    "description": "2-3 sentences explaining what the data shows",
    "recommendation": "Specific action to take with expected impact",
    "impact": "high|medium|low",
    "data": { "metric": "value" }
  }
]`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type === "text" && content.text.trim()) {
      const text = content.text.trim();
      // Extract JSON array from response (may be wrapped in code fences)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as CommunityInsight[];
        console.log(
          "[CommunityAdvisor] Generated",
          parsed.length,
          "insights"
        );
        return parsed;
      }
    }

    console.warn("[CommunityAdvisor] Failed to parse Claude response");
    return [];
  } catch (error) {
    console.error("[CommunityAdvisor] Error generating insights:", error);
    throw error;
  }
}
