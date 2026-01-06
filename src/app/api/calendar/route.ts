import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!startStr || !endStr) {
      return NextResponse.json(
        { error: "start and end dates are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    // Fetch scheduled GeneratedContent
    const generatedContent = await prisma.generatedContent.findMany({
      where: {
        scheduledFor: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ["scheduled", "published", "failed"] },
      },
      orderBy: { scheduledFor: "asc" },
    });

    // Try to fetch CampaignPosts if table exists
    let campaignPosts: Array<{
      id: string;
      content: string;
      platform: string;
      scheduledFor: Date;
      status: string;
      visualUrl: string | null;
      campaign: { id: string; name: string } | null;
    }> = [];
    
    try {
      campaignPosts = await prisma.campaignPost.findMany({
        where: {
          scheduledFor: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          campaign: {
            select: { id: true, name: true },
          },
        },
        orderBy: { scheduledFor: "asc" },
      });
    } catch {
      // Campaign tables may not exist yet - that's okay
      console.log("[Calendar] CampaignPost table not found, skipping");
    }

    // Transform to unified format
    const posts = [
      ...generatedContent.map((content) => ({
        id: content.id,
        type: "content" as const,
        title: content.title || "",
        text: content.text || "",
        platform: content.platform,
        scheduledFor: content.scheduledFor?.toISOString() || "",
        status: content.status as "draft" | "scheduled" | "publishing" | "published" | "failed",
        imageUrl: content.mediaUrl,
      })),
      ...campaignPosts.map((post) => ({
        id: post.id,
        type: "campaign" as const,
        title: "",
        text: post.content,
        platform: post.platform,
        scheduledFor: post.scheduledFor.toISOString(),
        status: post.status as "draft" | "scheduled" | "publishing" | "published" | "failed",
        campaignId: post.campaign?.id,
        campaignName: post.campaign?.name,
        imageUrl: post.visualUrl,
      })),
    ].sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[Calendar] Error fetching calendar data:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}




