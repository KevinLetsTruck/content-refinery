import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// POST /api/queue/[id]/approve - Approve content for scheduling
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const content = await prisma.generatedContent.update({
      where: { id },
      data: {
        status: "approved",
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("Error approving content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
