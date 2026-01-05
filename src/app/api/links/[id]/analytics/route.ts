import { NextRequest, NextResponse } from "next/server";
import { getLinkAnalytics } from "@/lib/links/manager";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const analytics = await getLinkAnalytics(params.id);

    if (!analytics) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[Links] Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

