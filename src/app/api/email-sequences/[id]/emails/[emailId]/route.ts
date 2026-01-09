import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

interface RouteParams {
  params: Promise<{ id: string; emailId: string }>;
}

/**
 * GET /api/email-sequences/:id/emails/:emailId
 * Get a specific email
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, emailId } = await params;

    const email = await prisma.email.findFirst({
      where: {
        id: emailId,
        sequenceId: id,
      },
      include: {
        sequence: {
          select: { id: true, name: true },
        },
      },
    });

    if (!email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error("[Emails] Get error:", error);
    return NextResponse.json(
      { error: "Failed to get email" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/email-sequences/:id/emails/:emailId
 * Update a specific email's content
 *
 * Request body:
 * {
 *   subject?: string
 *   preheader?: string
 *   bodyHtml?: string
 *   bodyText?: string
 *   sendDelayDays?: number
 *   status?: "draft" | "approved" | "sent"
 * }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, emailId } = await params;
    const body = await request.json();

    // Verify email exists and belongs to sequence
    const existingEmail = await prisma.email.findFirst({
      where: {
        id: emailId,
        sequenceId: id,
      },
    });

    if (!existingEmail) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    const {
      subject,
      preheader,
      bodyHtml,
      bodyText,
      sendDelayDays,
      status,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (subject !== undefined) updateData.subject = subject;
    if (preheader !== undefined) updateData.preheader = preheader;
    if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
    if (bodyText !== undefined) updateData.bodyText = bodyText;
    if (sendDelayDays !== undefined) updateData.sendDelayDays = sendDelayDays;
    if (status !== undefined) updateData.status = status;

    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: updateData,
      include: {
        sequence: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      email: updatedEmail,
    });
  } catch (error) {
    console.error("[Emails] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/email-sequences/:id/emails/:emailId
 * Delete a specific email from a sequence
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, emailId } = await params;

    // Verify email exists and belongs to sequence
    const existingEmail = await prisma.email.findFirst({
      where: {
        id: emailId,
        sequenceId: id,
      },
    });

    if (!existingEmail) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    await prisma.email.delete({
      where: { id: emailId },
    });

    // Reorder remaining emails
    const remainingEmails = await prisma.email.findMany({
      where: { sequenceId: id },
      orderBy: { order: "asc" },
    });

    // Update order for each remaining email
    for (let i = 0; i < remainingEmails.length; i++) {
      if (remainingEmails[i].order !== i + 1) {
        await prisma.email.update({
          where: { id: remainingEmails[i].id },
          data: { order: i + 1 },
        });
      }
    }

    // Update sequence length
    await prisma.emailSequence.update({
      where: { id },
      data: { sequenceLength: remainingEmails.length },
    });

    return NextResponse.json({
      success: true,
      message: "Email deleted",
    });
  } catch (error) {
    console.error("[Emails] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    );
  }
}
