import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import {
  regenerateEmail,
  SequenceGeneratorInput,
  getSequenceConfig,
} from "@/lib/email/sequence-generator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/email-sequences/:id
 * Get a specific email sequence with all emails
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const sequence = await prisma.emailSequence.findUnique({
      where: { id },
      include: {
        emails: {
          orderBy: { order: "asc" },
        },
        campaign: {
          select: { id: true, name: true },
        },
        leadMagnet: {
          select: { id: true, title: true, slug: true, description: true },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: "Email sequence not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error("[EmailSequences] Get error:", error);
    return NextResponse.json(
      { error: "Failed to get email sequence" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/email-sequences/:id
 * Update an email sequence or regenerate specific emails
 *
 * Request body:
 * {
 *   name?: string
 *   status?: "draft" | "active" | "paused" | "completed"
 *   productId?: string
 *   productName?: string
 *   productUrl?: string
 *   regenerateEmail?: number (1-based index of email to regenerate)
 *   feedback?: string (feedback for regeneration)
 * }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      status,
      productId,
      productName,
      productUrl,
      regenerateEmail: emailIndex,
      feedback,
    } = body;

    // Get existing sequence
    const sequence = await prisma.emailSequence.findUnique({
      where: { id },
      include: {
        emails: { orderBy: { order: "asc" } },
        leadMagnet: {
          select: { id: true, title: true, slug: true, description: true, extractedData: true },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: "Email sequence not found" },
        { status: 404 }
      );
    }

    // Handle email regeneration
    if (emailIndex !== undefined) {
      if (emailIndex < 1 || emailIndex > sequence.emails.length) {
        return NextResponse.json(
          { error: "Invalid email index" },
          { status: 400 }
        );
      }

      const emailToRegenerate = sequence.emails[emailIndex - 1];
      const config = getSequenceConfig(sequence.sequenceLength as 3 | 5 | 7);

      // Extract key points from lead magnet
      const extractedData = sequence.leadMagnet?.extractedData as Record<string, unknown> | null;
      const keyPoints = extractedData?.keyPoints as string[] | undefined;

      const input: SequenceGeneratorInput = {
        leadMagnetTitle: sequence.leadMagnet?.title || sequence.name,
        leadMagnetSlug: sequence.leadMagnet?.slug || undefined,
        leadMagnetDescription: sequence.leadMagnet?.description || undefined,
        leadMagnetKeyPoints: keyPoints,
        sequenceLength: sequence.sequenceLength as 3 | 5 | 7,
        productId: sequence.productId || undefined,
        productName: sequence.productName || undefined,
        productUrl: sequence.productUrl || undefined,
      };

      const regenerated = await regenerateEmail(
        input,
        emailIndex - 1,
        emailToRegenerate.purpose as "value" | "engagement" | "soft_pitch" | "hard_pitch",
        config.delays[emailIndex - 1],
        feedback
      );

      // Update the email in database
      await prisma.email.update({
        where: { id: emailToRegenerate.id },
        data: {
          subject: regenerated.subject,
          preheader: regenerated.preheader,
          bodyHtml: regenerated.bodyHtml,
          bodyText: regenerated.bodyText,
        },
      });

      // Fetch updated sequence
      const updatedSequence = await prisma.emailSequence.findUnique({
        where: { id },
        include: {
          emails: { orderBy: { order: "asc" } },
          campaign: { select: { id: true, name: true } },
          leadMagnet: { select: { id: true, title: true, slug: true } },
        },
      });

      return NextResponse.json({
        success: true,
        sequence: updatedSequence,
        regeneratedEmail: regenerated,
      });
    }

    // Handle regular updates
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (productId !== undefined) updateData.productId = productId;
    if (productName !== undefined) updateData.productName = productName;
    if (productUrl !== undefined) updateData.productUrl = productUrl;

    const updatedSequence = await prisma.emailSequence.update({
      where: { id },
      data: updateData,
      include: {
        emails: { orderBy: { order: "asc" } },
        campaign: { select: { id: true, name: true } },
        leadMagnet: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json({
      success: true,
      sequence: updatedSequence,
    });
  } catch (error) {
    console.error("[EmailSequences] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update email sequence" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/email-sequences/:id
 * Delete an email sequence and all its emails
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if sequence exists
    const sequence = await prisma.emailSequence.findUnique({
      where: { id },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: "Email sequence not found" },
        { status: 404 }
      );
    }

    // Delete all emails first (cascade)
    await prisma.email.deleteMany({
      where: { sequenceId: id },
    });

    // Delete the sequence
    await prisma.emailSequence.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Email sequence deleted",
    });
  } catch (error) {
    console.error("[EmailSequences] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete email sequence" },
      { status: 500 }
    );
  }
}
