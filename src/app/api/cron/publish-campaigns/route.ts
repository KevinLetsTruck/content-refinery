import { NextRequest, NextResponse } from "next/server";
import { publishDuePosts, checkCampaignCompletion } from "@/lib/campaigns/publisher";
import prisma from "@/lib/db/prisma";

export const maxDuration = 60; // Allow up to 60 seconds for this function

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting campaign publish job...");

    // Publish due posts
    const publishResults = await publishDuePosts();

    console.log(`[Cron] Published: ${publishResults.published}, Failed: ${publishResults.failed}`);

    // Check for campaign completions
    const activeCampaigns = await prisma.campaign.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    for (const campaign of activeCampaigns) {
      await checkCampaignCompletion(campaign.id);
    }

    return NextResponse.json({
      success: true,
      published: publishResults.published,
      failed: publishResults.failed,
      errors: publishResults.errors,
      activeCampaigns: activeCampaigns.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Publish campaigns error:", error);
    return NextResponse.json(
      { error: "Publish job failed" },
      { status: 500 }
    );
  }
}

