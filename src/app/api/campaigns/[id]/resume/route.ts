import { NextRequest, NextResponse } from "next/server";
import { resumeCampaign } from "@/lib/campaigns/launcher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resumeCampaign(id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Campaign is not paused" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Campaign resume error:", error);
    return NextResponse.json(
      { error: "Failed to resume campaign" },
      { status: 500 }
    );
  }
}




