import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const { id: campaignId, videoId } = await params;

    const video = await prisma.campaignVideo.findUnique({
      where: {
        id: videoId,
        campaignId,
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ video });
  } catch (error) {
    console.error("[API] Video get error:", error);
    return NextResponse.json(
      { error: "Failed to get video" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const { id: campaignId, videoId } = await params;
    const body = await request.json();

    const video = await prisma.campaignVideo.update({
      where: {
        id: videoId,
        campaignId,
      },
      data: {
        title: body.title,
        purpose: body.purpose,
        scriptData: body.scriptData,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      },
    });

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error("[API] Video update error:", error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}
