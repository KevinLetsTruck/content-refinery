import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

// GET /api/queue - Get content items by status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const platform = searchParams.get("platform");
    const status = searchParams.get("status") || "pending";
    const limitParam = searchParams.get("limit");
    // Guard against NaN from parseInt
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : 50;

    // Map status to database values
    const statusMap: Record<string, string[]> = {
      pending: ["pending", "pending_review", "draft"],
      approved: ["approved", "scheduled"],
      published: ["published"],
      failed: ["failed"],
    };

    const dbStatuses = statusMap[status] || [status];

    const items = await prisma.generatedContent.findMany({
      where: {
        status: { in: dbStatuses },
        ...(platform ? { platform } : {}),
      },
      include: {
        extraction: {
          include: {
            source: {
              select: {
                title: true,
                sourceType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Transform to match expected format
    const transformedItems = items.map((item) => ({
      id: item.id,
      platform: item.platform,
      text: item.text,
      hashtags: item.hashtags,
      status: item.status,
      created_at: item.createdAt,
      extraction_type: item.extraction?.type,
      extraction_text: item.extraction?.text,
      confidence: item.extraction?.confidence?.toNumber(),
      source_title: item.extraction?.source?.title,
      source_type: item.extraction?.source?.sourceType,
      platformPostUrl: item.platformPostUrl,
      publishedAt: item.publishedAt,
      mediaUrl: item.mediaUrl,
    }));

    return NextResponse.json({ items: transformedItems });
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
