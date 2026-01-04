import { NextRequest, NextResponse } from "next/server";
import { updateAllWeights } from "@/lib/analytics/learning-engine";

/**
 * GET /api/cron/update-weights
 * 
 * Weekly cron job to recalculate content weights
 * Run every Sunday at 3 AM
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    console.log("[Cron] Starting weekly weight recalculation...");
    
    const startTime = Date.now();
    const results = await updateAllWeights();
    const duration = Date.now() - startTime;
    
    console.log(`[Cron] Weight update completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      ...results,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("[Cron] Weight update failed:", error);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

