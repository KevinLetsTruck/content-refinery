import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { generatePlatformContent, Platform } from "@/lib/ai/claude";

// POST /api/queue/[id]/regenerate - Regenerate content with AI
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get the current content and its extraction
    const content = await prisma.generatedContent.findUnique({
      where: { id },
      include: {
        extraction: true,
      },
    });

    if (!content || !content.extraction) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Regenerate using Claude
    const newContent = await generatePlatformContent(
      {
        type: content.extraction.type as any,
        text: content.extraction.text,
        confidence: Number(content.extraction.confidence),
      },
      content.platform as Platform
    );

    // Update the content
    const updated = await prisma.generatedContent.update({
      where: { id },
      data: {
        text: newContent.text,
        hashtags: newContent.hashtags || [],
        mediaGuidance: newContent.mediaGuidance || null,
      },
    });

    return NextResponse.json({
      success: true,
      text: updated.text,
      hashtags: updated.hashtags,
    });
  } catch (error) {
    console.error("Error regenerating content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
