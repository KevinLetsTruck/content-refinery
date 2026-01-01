import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// GET /api/queue - Get all pending review items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const platform = searchParams.get("platform");
    const limit = parseInt(searchParams.get("limit") || "50");

    const items = await prisma.generatedContent.findMany({
      where: {
        status: "pending_review",
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
      confidence: item.extraction?.confidence,
      source_title: item.extraction?.source?.title,
      source_type: item.extraction?.source?.sourceType,
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
