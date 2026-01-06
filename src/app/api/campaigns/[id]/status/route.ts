import { NextRequest, NextResponse } from "next/server";
import { getCampaignStatus } from "@/lib/campaigns/launcher";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const status = await getCampaignStatus(id);

    if (!status) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("[API] Campaign status error:", error);
    return NextResponse.json(
      { error: "Failed to get campaign status" },
      { status: 500 }
    );
  }
}




