import { NextRequest, NextResponse } from "next/server";
import { reschedulePost } from "@/lib/campaigns/smart-scheduler";
import prisma from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { postId, newDateTime } = body;

    if (!postId || !newDateTime) {
      return NextResponse.json(
        { error: "postId and newDateTime are required" },
        { status: 400 }
      );
    }

    // Verify post belongs to this campaign
    const post = await prisma.campaignPost.findFirst({
      where: {
        id: postId,
        campaignId: id,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found in this campaign" },
        { status: 404 }
      );
    }

    await reschedulePost(postId, new Date(newDateTime));

    return NextResponse.json({
      success: true,
      message: "Post rescheduled",
    });
  } catch (error) {
    console.error("[API] Reschedule error:", error);
    return NextResponse.json(
      { error: "Failed to reschedule post" },
      { status: 500 }
    );
  }
}



