import { NextRequest, NextResponse } from "next/server";
import { createTrackedLink } from "@/lib/links/manager";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// GET - List links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("contentId");
    const campaignId = searchParams.get("campaignId");

    const where: {
      contentId?: string;
      campaignId?: string;
    } = {};
    if (contentId) where.contentId = contentId;
    if (campaignId) where.campaignId = campaignId;

    const links = await prisma.trackedLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        content: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error("[Links] List error:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}

// POST - Create tracked link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      destinationUrl,
      contentId,
      campaignId,
      productId,
      platform,
      campaignName,
      customShortCode,
    } = body;

    if (!destinationUrl) {
      return NextResponse.json(
        { error: "destinationUrl required" },
        { status: 400 }
      );
    }

    const result = await createTrackedLink({
      destinationUrl,
      contentId,
      campaignId,
      productId,
      platform,
      campaignName,
      customShortCode,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Links] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}




