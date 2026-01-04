import { NextRequest, NextResponse } from "next/server";
import { collectMetricsForPost } from "@/lib/analytics/metrics-collector";

/**
 * POST /api/analytics/refresh
 * 
 * Manually refresh metrics for specific posts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentIds } = body;
    
    if (!contentIds || !Array.isArray(contentIds)) {
      return NextResponse.json(
        { error: "contentIds array required" },
        { status: 400 }
      );
    }
    
    const results: Record<string, boolean> = {};
    
    for (const contentId of contentIds.slice(0, 10)) { // Limit to 10 at a time
      results[contentId] = await collectMetricsForPost(contentId);
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return NextResponse.json({
      success: true,
      results,
    });
    
  } catch (error) {
    console.error("[Analytics] Refresh error:", error);
    return NextResponse.json(
      { error: "Refresh failed" },
      { status: 500 }
    );
  }
}

