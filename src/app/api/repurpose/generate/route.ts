import { NextRequest, NextResponse } from "next/server";
import { repurposeContent, dismissSuggestion } from "@/lib/repurpose/engine";

export const dynamic = "force-dynamic";

// POST - Generate repurposed content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, targetFormat, platform, customInstructions } = body;

    if (!contentId || !targetFormat) {
      return NextResponse.json(
        { error: "contentId and targetFormat required" },
        { status: 400 }
      );
    }

    const newContent = await repurposeContent(contentId, targetFormat, {
      platform,
      customInstructions,
    });

    return NextResponse.json({
      success: true,
      content: newContent,
    });
  } catch (error) {
    console.error("[Repurpose] Generate error:", error);
    return NextResponse.json(
      { error: "Failed to repurpose content" },
      { status: 500 }
    );
  }
}

// DELETE - Dismiss a suggestion
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const suggestionId = searchParams.get("id");

    if (!suggestionId) {
      return NextResponse.json(
        { error: "Suggestion ID required" },
        { status: 400 }
      );
    }

    await dismissSuggestion(suggestionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Repurpose] Dismiss error:", error);
    return NextResponse.json(
      { error: "Failed to dismiss suggestion" },
      { status: 500 }
    );
  }
}

