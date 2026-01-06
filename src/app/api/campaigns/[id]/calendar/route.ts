import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        posts: {
          orderBy: { scheduledFor: "asc" },
          select: {
            id: true,
            platform: true,
            content: true,
            contentType: true,
            dayNumber: true,
            scheduledFor: true,
            status: true,
            visualUrl: true,
            phase: {
              select: { name: true },
            },
          },
        },
        videos: {
          orderBy: { scheduledFor: "asc" },
          select: {
            id: true,
            title: true,
            videoType: true,
            dayNumber: true,
            scheduledFor: true,
            status: true,
          },
        },
        phases: {
          orderBy: { orderIndex: "asc" },
          select: {
            name: true,
            startDay: true,
            endDay: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Transform into calendar format
    const calendarData: Record<string, {
      date: string;
      dayNumber: number;
      phase: string;
      posts: Array<{
        id: string;
        platform: string;
        time: string;
        content: string;
        status: string;
        hasVisual: boolean;
      }>;
      videos: Array<{
        id: string;
        title: string;
        type: string;
        time: string;
        status: string;
      }>;
    }> = {};

    // Initialize all days
    for (let day = 1; day <= campaign.durationDays; day++) {
      const date = new Date(campaign.startDate);
      date.setDate(date.getDate() + day - 1);
      const dateStr = date.toISOString().split("T")[0];

      const phase = campaign.phases.find(
        (p) => day >= p.startDay && day <= p.endDay
      );

      calendarData[dateStr] = {
        date: dateStr,
        dayNumber: day,
        phase: phase?.name || "",
        posts: [],
        videos: [],
      };
    }

    // Add posts
    for (const post of campaign.posts) {
      const dateStr = post.scheduledFor.toISOString().split("T")[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].posts.push({
          id: post.id,
          platform: post.platform,
          time: post.scheduledFor.toISOString(),
          content: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : ""),
          status: post.status,
          hasVisual: !!post.visualUrl,
        });
      }
    }

    // Add videos
    for (const video of campaign.videos) {
      const dateStr = video.scheduledFor.toISOString().split("T")[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].videos.push({
          id: video.id,
          title: video.title,
          type: video.videoType,
          time: video.scheduledFor.toISOString(),
          status: video.status,
        });
      }
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        status: campaign.status,
      },
      calendar: Object.values(calendarData),
      phases: campaign.phases,
    });
  } catch (error) {
    console.error("[API] Calendar error:", error);
    return NextResponse.json(
      { error: "Failed to get calendar data" },
      { status: 500 }
    );
  }
}



