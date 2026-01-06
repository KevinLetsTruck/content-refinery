import { NextRequest, NextResponse } from "next/server";
import {
  scheduleEvergreenReshares,
  updateEvergreenScores,
} from "@/lib/evergreen/manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Update evergreen scores first
    const scoresUpdated = await updateEvergreenScores();

    // Schedule reshares for today
    const result = await scheduleEvergreenReshares();

    console.log(
      `[Evergreen Cron] Scheduled ${result.scheduled} reshares:`,
      result.platforms
    );

    return NextResponse.json({
      success: true,
      scoresUpdated,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Evergreen Cron] Error:", error);
    return NextResponse.json(
      { error: "Failed to schedule evergreen content" },
      { status: 500 }
    );
  }
}



