import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// GET /api/queue/[id] - Get single queue item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const item = await prisma.generatedContent.findUnique({
      where: { id },
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
    });

    if (!item) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Transform to expected format
    const transformedItem = {
      ...item,
      extraction_type: item.extraction?.type,
      extraction_text: item.extraction?.text,
      confidence: item.extraction?.confidence,
      source_title: item.extraction?.source?.title,
    };

    return NextResponse.json({ item: transformedItem });
  } catch (error) {
    console.error("Error fetching queue item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/queue/[id] - Update content text
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { text, hashtags } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const content = await prisma.generatedContent.update({
      where: { id },
      data: {
        text,
        hashtags: hashtags || [],
      },
    });

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("Error updating content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
