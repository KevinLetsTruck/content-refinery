import { NextRequest, NextResponse } from "next/server";
import { getSchedulingSuggestions } from "@/lib/campaigns/smart-scheduler";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const dateStr = searchParams.get("date");

    if (!platform || !dateStr) {
      return NextResponse.json(
        { error: "platform and date are required" },
        { status: 400 }
      );
    }

    const suggestions = await getSchedulingSuggestions(
      platform,
      new Date(dateStr)
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[API] Suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}

