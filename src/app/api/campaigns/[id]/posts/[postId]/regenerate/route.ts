import { NextRequest, NextResponse } from "next/server";
import { regeneratePost } from "@/lib/campaigns/strategy-generator";
import prisma from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;

    // Get campaign and post context
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    const existingPost = await prisma.campaignPost.findUnique({
      where: { id: postId },
      include: { phase: true },
    });

    if (!campaign || !existingPost) {
      return NextResponse.json(
        { error: "Campaign or post not found" },
        { status: 404 }
      );
    }

    const newContent = await regeneratePost(
      {
        name: campaign.name,
        goal: campaign.goal,
        productName: campaign.productName || undefined,
        topic: campaign.topic || undefined,
      },
      {
        platform: existingPost.platform,
        phase: existingPost.phase?.name || "General",
        dayNumber: existingPost.dayNumber,
      }
    );

    const updatedPost = await prisma.campaignPost.update({
      where: { id: postId },
      data: {
        content: newContent.content,
        hashtags: newContent.hashtags,
        visualPrompt: newContent.visualPrompt,
      },
    });

    return NextResponse.json({
      success: true,
      content: updatedPost.content,
      hashtags: updatedPost.hashtags,
      post: updatedPost
    });
  } catch (error) {
    console.error("[API] Post regenerate error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate post" },
      { status: 500 }
    );
  }
}
