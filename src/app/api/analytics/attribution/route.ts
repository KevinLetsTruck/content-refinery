import { NextRequest, NextResponse } from "next/server";
import { getContentAttributionReport } from "@/lib/links/manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await getContentAttributionReport(startDate, endDate);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[Attribution] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attribution data" },
      { status: 500 }
    );
  }
}




