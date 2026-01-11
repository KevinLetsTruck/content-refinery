import { NextResponse } from "next/server";
import { collectAllMetrics } from "@/lib/analytics/metrics-collector";

/**
 * POST /api/analytics/refresh
 *
 * Manually trigger metrics collection from the Analytics page
 * This is rate-limited to once per 5 minutes to avoid API abuse
 */

let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export async function POST() {
  const now = Date.now();

  // Rate limit check
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
    const waitTime = Math.ceil((MIN_REFRESH_INTERVAL - (now - lastRefreshTime)) / 1000);
    return NextResponse.json(
      {
        error: "Rate limited",
        message: `Please wait ${waitTime} seconds before refreshing again`,
        nextRefreshAt: new Date(lastRefreshTime + MIN_REFRESH_INTERVAL).toISOString(),
      },
      { status: 429 }
    );
  }

  try {
    console.log("[Analytics] Manual metrics refresh triggered...");
    lastRefreshTime = now;

    const startTime = Date.now();
    const result = await collectAllMetrics();
    const duration = Date.now() - startTime;

    console.log(`[Analytics] Manual refresh completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      ...result,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      nextRefreshAt: new Date(now + MIN_REFRESH_INTERVAL).toISOString(),
    });

  } catch (error) {
    console.error("[Analytics] Manual refresh failed:", error);

    return NextResponse.json(
      {
        error: "Refresh failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
