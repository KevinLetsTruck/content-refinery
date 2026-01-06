import { NextRequest, NextResponse } from "next/server";
import { updateCampaignPost } from "@/lib/campaigns/campaign-manager";
import { regeneratePost } from "@/lib/campaigns/strategy-generator";
import prisma from "@/lib/db/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { postId } = await params;
    const body = await request.json();

    const post = await updateCampaignPost(postId, {
      content: body.content,
      hashtags: body.hashtags,
      visualPrompt: body.visualPrompt,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("[API] Post update error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  // Regenerate post with AI
  try {
    const { id, postId } = await params;
    const body = await request.json();
    
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
      },
      body.instruction
    );

    const updatedPost = await prisma.campaignPost.update({
      where: { id: postId },
      data: {
        content: newContent.content,
        hashtags: newContent.hashtags,
        visualPrompt: newContent.visualPrompt,
      },
    });

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error("[API] Post regenerate error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate post" },
      { status: 500 }
    );
  }
}




