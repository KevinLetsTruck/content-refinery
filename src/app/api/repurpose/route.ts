import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRepurposeOpportunities,
  getPendingSuggestions,
} from "@/lib/repurpose/engine";

export const dynamic = "force-dynamic";

// GET - Get pending suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const suggestions = await getPendingSuggestions(limit);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[Repurpose] Get suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

// POST - Analyze content for repurposing opportunities
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId required" },
        { status: 400 }
      );
    }

    const result = await analyzeRepurposeOpportunities(contentId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Repurpose] Analyze error:", error);
    return NextResponse.json(
      { error: "Failed to analyze content" },
      { status: 500 }
    );
  }
}

