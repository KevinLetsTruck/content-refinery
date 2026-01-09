import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import {
  generateEmailSequence,
  SequenceGeneratorInput,
} from "@/lib/email/sequence-generator";

/**
 * GET /api/email-sequences
 * List all email sequences, optionally filtered by campaign or lead magnet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const leadMagnetId = searchParams.get("leadMagnetId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (campaignId) where.campaignId = campaignId;
    if (leadMagnetId) where.leadMagnetId = leadMagnetId;
    if (status) where.status = status;

    const sequences = await prisma.emailSequence.findMany({
      where,
      include: {
        emails: {
          orderBy: { order: "asc" },
        },
        campaign: {
          select: { id: true, name: true },
        },
        leadMagnet: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sequences });
  } catch (error) {
    console.error("[EmailSequences] List error:", error);
    return NextResponse.json(
      { error: "Failed to list email sequences" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email-sequences
 * Create a new email sequence (generates emails via AI)
 *
 * Request body:
 * {
 *   name?: string
 *   campaignId?: string
 *   leadMagnetId?: string
 *   listId?: string
 *   sequenceLength: 3 | 5 | 7
 *   productId?: string
 *   productName?: string
 *   productUrl?: string
 *   customPrompt?: string
 *   generateEmails?: boolean (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      campaignId,
      leadMagnetId,
      listId,
      sequenceLength = 5,
      productId,
      productName,
      productUrl,
      customPrompt,
      generateEmails = true,
    } = body;

    // Validate sequence length
    if (![3, 5, 7].includes(sequenceLength)) {
      return NextResponse.json(
        { error: "sequenceLength must be 3, 5, or 7" },
        { status: 400 }
      );
    }

    // Get lead magnet details if provided
    let leadMagnet = null;
    if (leadMagnetId) {
      leadMagnet = await prisma.leadMagnet.findUnique({
        where: { id: leadMagnetId },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          extractedData: true,
        },
      });

      if (!leadMagnet) {
        return NextResponse.json(
          { error: "Lead magnet not found" },
          { status: 404 }
        );
      }
    }

    // Create the sequence record first
    const sequence = await prisma.emailSequence.create({
      data: {
        name: name || (leadMagnet ? `${leadMagnet.title} Nurture Sequence` : "Email Sequence"),
        campaignId,
        leadMagnetId,
        listId,
        sequenceLength,
        productId,
        productName,
        productUrl,
        status: generateEmails ? "generating" : "draft",
      },
    });

    // Generate emails if requested
    if (generateEmails && leadMagnet) {
      try {
        // Extract key points from lead magnet extracted data
        const extractedData = leadMagnet.extractedData as Record<string, unknown> | null;
        const keyPoints = extractedData?.keyPoints as string[] | undefined;

        const input: SequenceGeneratorInput = {
          leadMagnetTitle: leadMagnet.title,
          leadMagnetSlug: leadMagnet.slug || undefined,
          leadMagnetDescription: leadMagnet.description || undefined,
          leadMagnetKeyPoints: keyPoints,
          sequenceLength: sequenceLength as 3 | 5 | 7,
          productId,
          productName,
          productUrl,
          customPrompt,
        };

        const generated = await generateEmailSequence(input);

        // Save generated emails to database
        await prisma.email.createMany({
          data: generated.emails.map((email) => ({
            sequenceId: sequence.id,
            order: email.order,
            sendDelayDays: email.sendDelayDays,
            subject: email.subject,
            preheader: email.preheader,
            bodyHtml: email.bodyHtml,
            bodyText: email.bodyText,
            purpose: email.purpose,
            status: "draft",
          })),
        });

        // Update sequence status
        await prisma.emailSequence.update({
          where: { id: sequence.id },
          data: { status: "draft" },
        });

        // Fetch the complete sequence with emails
        const completeSequence = await prisma.emailSequence.findUnique({
          where: { id: sequence.id },
          include: {
            emails: { orderBy: { order: "asc" } },
            campaign: { select: { id: true, name: true } },
            leadMagnet: { select: { id: true, title: true, slug: true } },
          },
        });

        return NextResponse.json({
          success: true,
          sequence: completeSequence,
          recommendedProducts: generated.recommendedProducts,
        });
      } catch (genError) {
        console.error("[EmailSequences] Generation error:", genError);

        // Update status to failed
        await prisma.emailSequence.update({
          where: { id: sequence.id },
          data: { status: "failed" },
        });

        return NextResponse.json(
          {
            error: "Failed to generate emails",
            sequenceId: sequence.id,
            details: genError instanceof Error ? genError.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Return sequence without generated emails
    const createdSequence = await prisma.emailSequence.findUnique({
      where: { id: sequence.id },
      include: {
        emails: { orderBy: { order: "asc" } },
        campaign: { select: { id: true, name: true } },
        leadMagnet: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json({
      success: true,
      sequence: createdSequence,
    });
  } catch (error) {
    console.error("[EmailSequences] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create email sequence" },
      { status: 500 }
    );
  }
}
