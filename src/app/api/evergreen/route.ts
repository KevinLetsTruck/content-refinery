import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import {
  markAsEvergreen,
  pauseEvergreen,
  resumeEvergreen,
} from "@/lib/evergreen/manager";

export const dynamic = "force-dynamic";

// GET - List evergreen content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const status = searchParams.get("status"); // active, paused, all

    const where: {
      isEvergreen: boolean;
      platform?: string;
      evergreenPausedAt?: null | { not: null };
    } = { isEvergreen: true };

    if (platform) {
      where.platform = platform;
    }

    if (status === "active") {
      where.evergreenPausedAt = null;
    } else if (status === "paused") {
      where.evergreenPausedAt = { not: null };
    }

    const content = await prisma.generatedContent.findMany({
      where,
      orderBy: { evergreenScore: "desc" },
      include: {
        reshares: {
          orderBy: { resharedAt: "desc" },
          take: 5,
        },
        _count: {
          select: { reshares: true },
        },
      },
    });

    return NextResponse.json({
      evergreen: content.map((c) => ({
        id: c.id,
        title: c.title,
        text: c.text,
        platform: c.platform,
        evergreenScore: c.evergreenScore,
        reshareCount: c.reshareCount,
        lastResharedAt: c.lastResharedAt,
        nextReshareDate: c.nextReshareDate,
        isPaused: !!c.evergreenPausedAt,
        totalReshares: c._count.reshares,
        recentReshares: c.reshares,
      })),
    });
  } catch (error) {
    console.error("[Evergreen] List error:", error);
    return NextResponse.json(
      { error: "Failed to fetch evergreen content" },
      { status: 500 }
    );
  }
}

// POST - Mark content as evergreen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, isEvergreen } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId required" },
        { status: 400 }
      );
    }

    await markAsEvergreen(contentId, isEvergreen !== false);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Evergreen] Mark error:", error);
    return NextResponse.json(
      { error: "Failed to update evergreen status" },
      { status: 500 }
    );
  }
}

// PATCH - Pause/Resume evergreen
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, action } = body;

    if (!contentId || !["pause", "resume"].includes(action)) {
      return NextResponse.json(
        { error: "contentId and action required" },
        { status: 400 }
      );
    }

    if (action === "pause") {
      await pauseEvergreen(contentId);
    } else {
      await resumeEvergreen(contentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Evergreen] Pause/Resume error:", error);
    return NextResponse.json(
      { error: "Failed to update evergreen status" },
      { status: 500 }
    );
  }
}



