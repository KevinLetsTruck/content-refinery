import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getConstantContactClient } from "@/lib/constant-contact/client";

/**
 * POST /api/leads/subscribe
 * Subscribe a lead to receive a lead magnet via email
 *
 * Request body:
 * {
 *   email: string (required)
 *   firstName?: string
 *   lastName?: string
 *   phone?: string
 *   leadMagnetId?: string
 *   landingPageSlug?: string
 *   listId: string (required - Constant Contact list ID)
 *   source?: string
 *   utmSource?: string
 *   utmMedium?: string
 *   utmCampaign?: string
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   lead: Lead object
 *   isNew: boolean
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      phone,
      leadMagnetId,
      landingPageSlug,
      listId,
      source,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    // Validate required fields
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!listId || typeof listId !== "string") {
      return NextResponse.json(
        { error: "List ID is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing lead with same email and lead magnet
    const existingLead = await prisma.lead.findFirst({
      where: {
        email: normalizedEmail,
        leadMagnetId: leadMagnetId || null,
      },
    });

    let lead;
    let isNew = false;

    if (existingLead) {
      // Update existing lead
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          firstName: firstName || existingLead.firstName,
          lastName: lastName || existingLead.lastName,
          phone: phone || existingLead.phone,
          isSubscribed: true,
          unsubscribedAt: null,
        },
      });
      console.log(`[Leads] Updated existing lead: ${lead.id}`);
    } else {
      // Create new lead
      lead = await prisma.lead.create({
        data: {
          email: normalizedEmail,
          firstName,
          lastName,
          phone,
          leadMagnetId,
          landingPageSlug,
          source,
          utmSource,
          utmMedium,
          utmCampaign,
          ccListIds: [listId],
        },
      });
      isNew = true;
      console.log(`[Leads] Created new lead: ${lead.id}`);
    }

    // Sync to Constant Contact
    let ccContactId = lead.ccContactId;
    try {
      const ccClient = getConstantContactClient();

      // Check if we're authenticated
      const isAuth = await ccClient.isAuthenticated();
      if (!isAuth) {
        console.warn("[Leads] Constant Contact not authenticated - skipping sync");
      } else {
        const ccResult = await ccClient.upsertContact({
          email: normalizedEmail,
          firstName,
          lastName,
          phone,
          listIds: [listId],
        });

        ccContactId = ccResult.contact_id;

        // Tag the contact with the lead magnet name if we have one
        if (leadMagnetId) {
          const leadMagnet = await prisma.leadMagnet.findUnique({
            where: { id: leadMagnetId },
            select: { title: true },
          });

          if (leadMagnet) {
            const tagName = `downloaded-${leadMagnet.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .slice(0, 50)}`;

            await ccClient.tagContact(ccContactId, tagName);
            console.log(`[Leads] Tagged contact with: ${tagName}`);
          }
        }

        // Update lead with CC sync info
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            ccContactId,
            ccSyncedAt: new Date(),
            emailSentAt: new Date(), // CC will send the email via automation
          },
        });

        console.log(`[Leads] Synced to Constant Contact: ${ccContactId}`);
      }
    } catch (ccError) {
      console.error("[Leads] Constant Contact sync failed:", ccError);
      // Don't fail the request - lead is still saved locally
    }

    // Increment download count on lead magnet if applicable
    if (leadMagnetId) {
      await prisma.leadMagnet.update({
        where: { id: leadMagnetId },
        data: { downloadCount: { increment: 1 } },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        email: lead.email,
        firstName: lead.firstName,
        ccContactId,
      },
      isNew,
      message: isNew
        ? "Successfully subscribed! Check your email for the download link."
        : "You're already subscribed! We've resent the download link.",
    });
  } catch (error) {
    console.error("[Leads] Subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads/subscribe
 * Get subscription status for an email
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const leadMagnetId = searchParams.get("leadMagnetId");

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      leadMagnetId: leadMagnetId || undefined,
    },
    select: {
      id: true,
      email: true,
      isSubscribed: true,
      emailSentAt: true,
      downloadedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    subscribed: !!lead?.isSubscribed,
    lead,
  });
}
