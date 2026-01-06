import { NextRequest, NextResponse } from "next/server";
import { pauseCampaign } from "@/lib/campaigns/launcher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pauseCampaign(id);
    return NextResponse.json({ success: result.success });
  } catch (error) {
    console.error("[API] Campaign pause error:", error);
    return NextResponse.json(
      { error: "Failed to pause campaign" },
      { status: 500 }
    );
  }
}




