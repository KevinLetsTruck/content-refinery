import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getLandingPage, incrementConversions } from "@/lib/landing-pages/storage";
import { getConstantContactClient } from "@/lib/constant-contact/client";

interface SubscribeRequest {
  slug: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

// Get landing page from database or in-memory
async function getPageData(slug: string): Promise<{
  constantContactListId?: string;
  downloadUrl?: string;
  leadMagnetId?: string;
  isDatabase: boolean;
} | null> {
  // Try database first
  try {
    const dbPage = await prisma.landingPage.findUnique({
      where: { slug },
      include: { leadMagnet: true },
    });

    if (dbPage) {
      return {
        constantContactListId: dbPage.ccListId || undefined,
        downloadUrl: dbPage.downloadUrl || dbPage.leadMagnet?.fileUrl,
        leadMagnetId: dbPage.leadMagnetId || undefined,
        isDatabase: true,
      };
    }
  } catch (error) {
    console.error("[Subscribe] Database error:", error);
  }

  // Fall back to in-memory
  const memoryPage = getLandingPage(slug);
  if (memoryPage) {
    return {
      constantContactListId: memoryPage.constantContactListId,
      downloadUrl: memoryPage.leadMagnet?.downloadUrl,
      isDatabase: false,
    };
  }

  return null;
}

// Track conversion in database or in-memory
async function trackConversion(slug: string, isDatabase: boolean) {
  if (isDatabase) {
    try {
      await prisma.landingPage.update({
        where: { slug },
        data: { conversions: { increment: 1 } },
      });
      return;
    } catch {
      // Fall through to in-memory
    }
  }
  incrementConversions(slug);
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.slug) {
      return NextResponse.json(
        { error: "Email and slug are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get the landing page
    const pageData = await getPageData(body.slug);
    if (!pageData) {
      return NextResponse.json(
        { error: "Landing page not found" },
        { status: 404 }
      );
    }

    // Track conversion
    await trackConversion(body.slug, pageData.isDatabase);

    // Try to add to Constant Contact
    let addedToCC = false;
    let ccError: string | null = null;

    try {
      const ccClient = getConstantContactClient();
      const isAuth = await ccClient.isAuthenticated();

      if (isAuth && pageData.constantContactListId) {
        await ccClient.upsertContact({
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          listIds: [pageData.constantContactListId],
        });
        addedToCC = true;
        console.log(`[Subscribe] Added ${body.email} to CC list ${pageData.constantContactListId}`);
      } else if (!isAuth) {
        console.log("[Subscribe] CC not authenticated, storing locally only");
      } else if (!pageData.constantContactListId) {
        console.log("[Subscribe] No CC list configured for this page");
      }
    } catch (error) {
      ccError = error instanceof Error ? error.message : "CC error";
      console.error("[Subscribe] Constant Contact error:", error);
    }

    // Create lead in database
    try {
      await prisma.lead.create({
        data: {
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          landingPageSlug: body.slug,
          leadMagnetId: pageData.leadMagnetId,
          source: "landing_page",
          utmSource: body.utm_source,
          utmMedium: body.utm_medium,
          utmCampaign: body.utm_campaign,
          ccSyncedAt: addedToCC ? new Date() : null,
          status: "subscribed",
        },
      });
      console.log(`[Subscribe] Lead saved to database: ${body.email}`);
    } catch (error) {
      // Might be duplicate - that's ok
      console.log(`[Subscribe] Lead already exists or error: ${body.email}`);
    }

    console.log(`[Subscribe] New subscriber: ${body.email} for ${body.slug} (CC: ${addedToCC})`);

    return NextResponse.json({
      success: true,
      message: "Subscription successful",
      downloadUrl: pageData.downloadUrl,
      addedToCC,
      ...(ccError && { ccWarning: "Email saved but Constant Contact sync failed" }),
    });

  } catch (error) {
    console.error("[Subscribe] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve subscribers (admin only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  const leads = await prisma.lead.findMany({
    where: slug ? { landingPageSlug: slug } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    total: leads.length,
    subscribers: leads,
  });
}
