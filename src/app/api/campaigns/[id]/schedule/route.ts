import { NextRequest, NextResponse } from "next/server";
import { scheduleCampaign } from "@/lib/campaigns/smart-scheduler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await scheduleCampaign(id);

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
      conflicts: result.conflicts,
      message: `Scheduled ${result.scheduled} items${result.conflicts > 0 ? ` (${result.conflicts} conflicts resolved)` : ""}`,
    });
  } catch (error) {
    console.error("[API] Campaign schedule error:", error);
    return NextResponse.json(
      { error: "Failed to schedule campaign" },
      { status: 500 }
    );
  }
}

