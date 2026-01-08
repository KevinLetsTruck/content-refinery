import { NextRequest, NextResponse } from "next/server";
import { getFunnel, updateFunnel } from "@/lib/funnels/storage";
import { FunnelEmail } from "@/lib/funnels/types";

/**
 * GET /api/funnels/[id]/emails
 * Return just the email sequence for a funnel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const funnel = getFunnel(id);

    if (!funnel) {
      return NextResponse.json(
        { error: "Funnel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      listId: funnel.emailSequence.listId,
      listName: funnel.emailSequence.listName,
      emails: funnel.emailSequence.emails,
    });
  } catch (error) {
    console.error("[API] Funnel emails get error:", error);
    return NextResponse.json(
      { error: "Failed to get emails" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/funnels/[id]/emails
 * Update email sequence for a funnel
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const funnel = getFunnel(id);
    if (!funnel) {
      return NextResponse.json(
        { error: "Funnel not found" },
        { status: 404 }
      );
    }

    // Validate emails array
    if (!Array.isArray(body.emails)) {
      return NextResponse.json(
        { error: "Request body must contain an 'emails' array" },
        { status: 400 }
      );
    }

    // Validate each email has required fields
    for (const email of body.emails) {
      if (!email.id || !email.subject || !email.body) {
        return NextResponse.json(
          { error: "Each email must have id, subject, and body" },
          { status: 400 }
        );
      }
    }

    // Update the email sequence
    const updatedEmails: FunnelEmail[] = body.emails.map((email: Partial<FunnelEmail>, index: number) => ({
      id: email.id || `email_${Date.now()}_${index}`,
      order: email.order ?? index + 1,
      subject: email.subject || "",
      previewText: email.previewText || "",
      body: email.body || "",
      sendDelay: email.sendDelay ?? (index * 24),
      purpose: email.purpose || "",
      status: email.status || "draft",
    }));

    const updated = updateFunnel(id, {
      emailSequence: {
        ...funnel.emailSequence,
        listId: body.listId || funnel.emailSequence.listId,
        listName: body.listName || funnel.emailSequence.listName,
        emails: updatedEmails,
      },
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update emails" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emails: updated.emailSequence.emails,
    });
  } catch (error) {
    console.error("[API] Funnel emails update error:", error);
    return NextResponse.json(
      { error: "Failed to update emails" },
      { status: 500 }
    );
  }
}
