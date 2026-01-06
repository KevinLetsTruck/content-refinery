import { NextRequest, NextResponse } from "next/server";
import { generateInsights } from "@/lib/advisor/insights";
import { generateWeeklyDigest } from "@/lib/advisor/digest";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate insights
    const insightsResult = await generateInsights();

    // Generate weekly digest on Sundays
    let digestResult = null;
    const today = new Date().getDay();
    if (today === 0) {
      digestResult = await generateWeeklyDigest();
    }

    return NextResponse.json({
      success: true,
      insights: insightsResult,
      digest: digestResult ? "Generated" : "Not Sunday",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Generate insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}



