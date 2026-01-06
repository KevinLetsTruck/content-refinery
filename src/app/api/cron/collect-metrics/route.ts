import { NextRequest, NextResponse } from "next/server";
import { collectAllMetrics } from "@/lib/analytics/metrics-collector";

/**
 * GET /api/cron/collect-metrics
 * 
 * Called by cron job every 6 hours to collect social media metrics
 * 
 * For Render: Use cron-job.org or similar external service
 * For Vercel: Add to vercel.json crons configuration
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow if no secret configured (development) or if secret matches
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Unauthorized metrics collection attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    console.log("[Cron] Starting scheduled metrics collection...");
    
    const startTime = Date.now();
    const result = await collectAllMetrics();
    const duration = Date.now() - startTime;
    
    console.log(`[Cron] Metrics collection completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      ...result,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("[Cron] Metrics collection failed:", error);
    
    return NextResponse.json(
      { 
        error: "Collection failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}



