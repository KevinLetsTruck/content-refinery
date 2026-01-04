import { NextRequest, NextResponse } from "next/server";
import { getContentRecommendations } from "@/lib/ai/smart-generator";
import { Platform, ContentPillar } from "@/lib/content/strategy";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "twitter";
  const pillar = searchParams.get("pillar") || undefined;
  
  try {
    const recommendations = await getContentRecommendations(
      platform as Platform,
      pillar as ContentPillar | undefined
    );
    
    return NextResponse.json(recommendations);
    
  } catch (error) {
    console.error("[Recommendations] Error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}

