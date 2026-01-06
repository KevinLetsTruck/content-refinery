import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { generateWeeklyDigest } from "@/lib/advisor/digest";

export const dynamic = "force-dynamic";

// GET - Get latest or specific digest
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get("weekStart");

    let digest;

    if (weekStartParam) {
      digest = await prisma.advisorDigest.findUnique({
        where: { weekStart: new Date(weekStartParam) },
      });
    } else {
      digest = await prisma.advisorDigest.findFirst({
        orderBy: { weekStart: "desc" },
      });
    }

    return NextResponse.json({ digest });
  } catch (error) {
    console.error("[Advisor] Get digest error:", error);
    return NextResponse.json(
      { error: "Failed to fetch digest" },
      { status: 500 }
    );
  }
}

// POST - Generate new digest
export async function POST() {
  try {
    const digest = await generateWeeklyDigest();

    if (!digest) {
      return NextResponse.json({
        success: false,
        message: "Not enough data to generate digest",
      });
    }

    return NextResponse.json({ success: true, digest });
  } catch (error) {
    console.error("[Advisor] Generate digest error:", error);
    return NextResponse.json(
      { error: "Failed to generate digest" },
      { status: 500 }
    );
  }
}




