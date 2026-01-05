import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Today's posts
    const todayPosts = await prisma.generatedContent.count({
      where: {
        scheduledFor: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: { in: ["scheduled", "published"] },
      },
    });

    // This week's posts
    const weekPosts = await prisma.generatedContent.count({
      where: {
        scheduledFor: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
        status: { in: ["scheduled", "published"] },
      },
    });

    // Pending (scheduled but not published)
    const pendingPosts = await prisma.generatedContent.count({
      where: {
        scheduledFor: { gte: now },
        status: "scheduled",
      },
    });

    // Published this week
    const publishedThisWeek = await prisma.generatedContent.count({
      where: {
        publishedAt: {
          gte: startOfWeek,
          lte: now,
        },
        status: "published",
      },
    });

    // By platform
    const byPlatform = await prisma.generatedContent.groupBy({
      by: ["platform"],
      where: {
        scheduledFor: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
        status: { in: ["scheduled", "published"] },
      },
      _count: true,
    });

    return NextResponse.json({
      today: todayPosts,
      thisWeek: weekPosts,
      pending: pendingPosts,
      publishedThisWeek,
      byPlatform: Object.fromEntries(
        byPlatform.map((p) => [p.platform, p._count])
      ),
    });
  } catch (error) {
    console.error("[Calendar] Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

