import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getConstantContactClient } from "@/lib/constant-contact/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SyncResult {
  emailId: string;
  emailOrder: number;
  subject: string;
  ccCampaignId: string;
  ccActivityId: string;
  status: "created" | "updated" | "skipped";
}

/**
 * POST /api/email-sequences/:id/sync-to-cc
 * Sync all emails in a sequence to Constant Contact as draft campaigns
 *
 * This creates each email as a separate campaign in CC's draft state.
 * The campaigns can then be scheduled or sent from CC or via additional API calls.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { overwrite = false } = body;

    // Get the email sequence with all emails
    const sequence = await prisma.emailSequence.findUnique({
      where: { id },
      include: {
        emails: {
          orderBy: { order: "asc" },
        },
        leadMagnet: {
          select: { title: true, slug: true },
        },
        campaign: {
          select: { name: true },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: "Email sequence not found" },
        { status: 404 }
      );
    }

    if (sequence.emails.length === 0) {
      return NextResponse.json(
        { error: "Email sequence has no emails to sync" },
        { status: 400 }
      );
    }

    // Get CC client
    const ccClient = getConstantContactClient();

    // Check if authenticated
    const isAuthed = await ccClient.isAuthenticated();
    if (!isAuthed) {
      return NextResponse.json(
        { error: "Constant Contact not authenticated. Please complete OAuth flow first." },
        { status: 401 }
      );
    }

    const results: SyncResult[] = [];
    const errors: Array<{ emailId: string; error: string }> = [];

    // Process each email
    for (const email of sequence.emails) {
      try {
        // Check if already synced
        if (email.ccCampaignId && !overwrite) {
          results.push({
            emailId: email.id,
            emailOrder: email.order,
            subject: email.subject,
            ccCampaignId: email.ccCampaignId,
            ccActivityId: "", // Would need to fetch to get this
            status: "skipped",
          });
          continue;
        }

        // If overwriting, delete the existing campaign first
        if (email.ccCampaignId && overwrite) {
          try {
            await ccClient.deleteEmailCampaign(email.ccCampaignId);
            console.log(`[Sync] Deleted existing CC campaign: ${email.ccCampaignId}`);
          } catch (deleteError) {
            console.warn(`[Sync] Could not delete campaign ${email.ccCampaignId}:`, deleteError);
          }
        }

        // Create campaign name
        const sequencePrefix = sequence.leadMagnet?.title || sequence.campaign?.name || sequence.name;
        const campaignName = `${sequencePrefix} - Email ${email.order}: ${email.subject}`.substring(0, 80);

        // Create the campaign in CC
        const ccResponse = await ccClient.createEmailCampaign({
          name: campaignName,
          subject: email.subject,
          preheader: email.preheader || undefined,
          htmlContent: email.bodyHtml,
        });

        // Get the activity ID
        const activityId = ccResponse.campaign_activities?.[0]?.campaign_activity_id || "";

        // Update our database with CC campaign ID
        await prisma.email.update({
          where: { id: email.id },
          data: {
            ccCampaignId: ccResponse.campaign_id,
          },
        });

        results.push({
          emailId: email.id,
          emailOrder: email.order,
          subject: email.subject,
          ccCampaignId: ccResponse.campaign_id,
          ccActivityId: activityId,
          status: email.ccCampaignId ? "updated" : "created",
        });

        console.log(`[Sync] Created CC campaign for email ${email.order}: ${ccResponse.campaign_id}`);

      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error(`[Sync] Failed to sync email ${email.id}:`, emailError);
        errors.push({
          emailId: email.id,
          error: errorMessage,
        });
      }
    }

    // Update sequence status if all synced successfully
    if (errors.length === 0) {
      await prisma.emailSequence.update({
        where: { id },
        data: { status: "active" },
      });
    }

    return NextResponse.json({
      success: errors.length === 0,
      sequenceId: id,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: sequence.emails.length,
        created: results.filter(r => r.status === "created").length,
        updated: results.filter(r => r.status === "updated").length,
        skipped: results.filter(r => r.status === "skipped").length,
        failed: errors.length,
      },
    });

  } catch (error) {
    console.error("[Sync] Email sequence sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync email sequence to Constant Contact" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email-sequences/:id/sync-to-cc
 * Check the sync status of emails in a sequence
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const sequence = await prisma.emailSequence.findUnique({
      where: { id },
      include: {
        emails: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            subject: true,
            ccCampaignId: true,
            status: true,
          },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: "Email sequence not found" },
        { status: 404 }
      );
    }

    const syncStatus = sequence.emails.map(email => ({
      emailId: email.id,
      order: email.order,
      subject: email.subject,
      ccCampaignId: email.ccCampaignId,
      isSynced: !!email.ccCampaignId,
      localStatus: email.status,
    }));

    const syncedCount = syncStatus.filter(s => s.isSynced).length;

    return NextResponse.json({
      sequenceId: id,
      totalEmails: sequence.emails.length,
      syncedEmails: syncedCount,
      isFullySynced: syncedCount === sequence.emails.length,
      emails: syncStatus,
    });

  } catch (error) {
    console.error("[Sync] Get sync status error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}
