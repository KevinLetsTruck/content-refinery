import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

/**
 * GET /api/lp/download?token=xxx
 * Verify download token and redirect to the actual file
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Download token is required" },
      { status: 400 }
    );
  }

  try {
    // Find lead with this token
    const lead = await prisma.lead.findFirst({
      where: { downloadToken: token },
      include: { leadMagnet: true },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Invalid or expired download token" },
        { status: 404 }
      );
    }

    // Get download URL from lead magnet or landing page
    let downloadUrl: string | undefined = lead.leadMagnet?.fileUrl || undefined;

    if (!downloadUrl && lead.landingPageSlug) {
      const landingPage = await prisma.landingPage.findUnique({
        where: { slug: lead.landingPageSlug },
      });
      downloadUrl = landingPage?.downloadUrl || undefined;
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "Download file not found" },
        { status: 404 }
      );
    }

    // Update lead to mark as downloaded
    await prisma.lead.update({
      where: { id: lead.id },
      data: { downloadedAt: new Date() },
    });

    console.log(`[Download] Lead ${lead.email} downloaded file with token`);

    // Redirect to the actual file
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error("[Download] Error:", error);
    return NextResponse.json(
      { error: "Failed to process download" },
      { status: 500 }
    );
  }
}
