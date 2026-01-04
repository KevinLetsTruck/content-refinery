import { NextRequest, NextResponse } from "next/server";
import { launchCampaign } from "@/lib/campaigns/launcher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await launchCampaign(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      postsScheduled: result.postsScheduled,
      videosQueued: result.videosQueued,
    });
  } catch (error) {
    console.error("[API] Campaign launch error:", error);
    return NextResponse.json(
      { error: "Failed to launch campaign" },
      { status: 500 }
    );
  }
}

