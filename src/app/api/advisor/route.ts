import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { generateInsights } from "@/lib/advisor/insights";

export const dynamic = "force-dynamic";

// GET - Get current insights
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "new";
    const type = searchParams.get("type");

    const where: {
      status?: string;
      type?: string;
      OR?: Array<{ expiresAt: null } | { expiresAt: { gt: Date } }>;
    } = {};

    if (status !== "all") {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Don't show expired insights
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];

    const insights = await prisma.contentInsight.findMany({
      where,
      orderBy: [
        { impact: "desc" },
        { confidence: "desc" },
        { createdAt: "desc" },
      ],
      take: 20,
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("[Advisor] Get insights error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}

// POST - Generate new insights
export async function POST() {
  try {
    const result = await generateInsights();

    return NextResponse.json({
      success: true,
      created: result.created,
      message: `Generated ${result.created} new insights`,
    });
  } catch (error) {
    console.error("[Advisor] Generate insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

// PATCH - Update insight status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { insightId, status } = body;

    if (!insightId || !status) {
      return NextResponse.json(
        { error: "insightId and status required" },
        { status: 400 }
      );
    }

    const insight = await prisma.contentInsight.update({
      where: { id: insightId },
      data: {
        status,
        actedOnAt: status === "acted_on" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, insight });
  } catch (error) {
    console.error("[Advisor] Update insight error:", error);
    return NextResponse.json(
      { error: "Failed to update insight" },
      { status: 500 }
    );
  }
}

