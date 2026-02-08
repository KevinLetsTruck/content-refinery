import { NextResponse } from "next/server";
import { getCommunityStats } from "@/lib/community/mighty-networks-data";
import { hasToken } from "@/lib/social/mighty-networks";

/**
 * GET /api/community/stats
 *
 * Fetch community stats from Mighty Networks API.
 * Returns member counts, revenue metrics, subscription breakdown,
 * top referrers, and tag distribution.
 *
 * Requires MIGHTY_NETWORKS_API_TOKEN env var.
 */
export async function GET() {
  try {
    if (!hasToken()) {
      return NextResponse.json(
        {
          error: "Mighty Networks API token not configured",
          configured: false,
        },
        { status: 200 }
      );
    }

    const stats = await getCommunityStats();

    return NextResponse.json({
      configured: true,
      ...stats,
    });
  } catch (error) {
    console.error("[Community] Stats endpoint error:", error);

    return NextResponse.json(
      {
        configured: true,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch community stats",
      },
      { status: 500 }
    );
  }
}
