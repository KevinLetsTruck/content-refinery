import { NextRequest, NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/campaigns/campaign-manager";
import { CreateCampaignInput } from "@/lib/campaigns/types";

export async function POST(request: NextRequest) {
  try {
    const body: CreateCampaignInput = await request.json();

    // Validate required fields
    if (!body.name || !body.campaignType || !body.goal || !body.startDate || !body.durationDays) {
      return NextResponse.json(
        { error: "Missing required fields: name, campaignType, goal, startDate, durationDays" },
        { status: 400 }
      );
    }

    // Set defaults
    const input: CreateCampaignInput = {
      ...body,
      platforms: body.platforms || ["twitter", "facebook", "instagram"],
      postsPerDay: body.postsPerDay || { twitter: 1, facebook: 1, instagram: 1 },
      youtubeShorts: body.youtubeShorts || 2,
      youtubeStandard: body.youtubeStandard || 0,
      keyMessages: body.keyMessages || [],
    };

    const result = await createCampaign(input);

    return NextResponse.json({
      success: true,
      ...result,
      message: "Campaign creation started. Content is being generated.",
    });
  } catch (error) {
    console.error("[API] Campaign create error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("[API] Campaign list error:", error);
    return NextResponse.json(
      { error: "Failed to list campaigns" },
      { status: 500 }
    );
  }
}




