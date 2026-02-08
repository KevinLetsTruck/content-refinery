import { NextResponse } from "next/server";
import { generateCommunityInsights } from "@/lib/community/community-advisor";
import type { CommunityStats } from "@/lib/community/types";

/**
 * POST /api/community/advisor
 *
 * Generate AI-powered community growth insights.
 * Accepts community stats in the request body and returns
 * Claude-generated recommendations.
 */
export async function POST(request: Request) {
  try {
    const stats = (await request.json()) as CommunityStats;

    if (!stats.members || !stats.revenue) {
      return NextResponse.json(
        { error: "Invalid community stats data" },
        { status: 400 }
      );
    }

    const insights = await generateCommunityInsights(stats);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("[Community] Advisor endpoint error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate community insights",
      },
      { status: 500 }
    );
  }
}
