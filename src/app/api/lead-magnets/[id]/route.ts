import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { deleteFromR2, isR2Configured } from "@/lib/storage/r2";

export const runtime = 'nodejs';

/**
 * GET /api/lead-magnets/[id]
 * Fetch a single lead magnet by id with extracted data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const leadMagnet = await prisma.leadMagnet.findUnique({
      where: { id },
    });

    if (!leadMagnet) {
      return NextResponse.json(
        { error: "Lead magnet not found" },
        { status: 404 }
      );
    }

    // Convert BigInt to string for JSON serialization
    const serializedLeadMagnet = {
      ...leadMagnet,
      fileSizeBytes: leadMagnet.fileSizeBytes?.toString() || null,
    };

    return NextResponse.json({
      leadMagnet: serializedLeadMagnet,
      extractedData: leadMagnet.extractedData,
    });
  } catch (error) {
    console.error("[Lead Magnets] Error fetching lead magnet:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead magnet" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lead-magnets/[id]
 * Update lead magnet fields (title, description, category, tags)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify lead magnet exists
    const existing = await prisma.leadMagnet.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Lead magnet not found" },
        { status: 404 }
      );
    }

    // Extract only allowed fields
    const updateData: {
      title?: string;
      description?: string | null;
      category?: string | null;
      tags?: string[];
      isActive?: boolean;
    } = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 }
      );
    }

    const leadMagnet = await prisma.leadMagnet.update({
      where: { id },
      data: updateData,
    });

    // Convert BigInt to string for JSON serialization
    const serializedLeadMagnet = {
      ...leadMagnet,
      fileSizeBytes: leadMagnet.fileSizeBytes?.toString() || null,
    };

    return NextResponse.json({
      success: true,
      leadMagnet: serializedLeadMagnet,
    });
  } catch (error) {
    console.error("[Lead Magnets] Error updating lead magnet:", error);
    return NextResponse.json(
      { error: "Failed to update lead magnet" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lead-magnets/[id]
 * Delete lead magnet from database and optionally from R2
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the lead magnet to get the storage key
    const leadMagnet = await prisma.leadMagnet.findUnique({
      where: { id },
    });

    if (!leadMagnet) {
      return NextResponse.json(
        { error: "Lead magnet not found" },
        { status: 404 }
      );
    }

    // Delete from database first
    await prisma.leadMagnet.delete({
      where: { id },
    });

    // Optionally delete from R2 if storage key exists and R2 is configured
    if (leadMagnet.storageKey && isR2Configured()) {
      try {
        await deleteFromR2(leadMagnet.storageKey);
        console.log(`[Lead Magnets] Deleted file from R2: ${leadMagnet.storageKey}`);
      } catch (r2Error) {
        // Log but don't fail - database record is already deleted
        console.error("[Lead Magnets] Failed to delete file from R2:", r2Error);
      }
    }

    console.log(`[Lead Magnets] Deleted lead magnet: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Lead Magnets] Error deleting lead magnet:", error);
    return NextResponse.json(
      { error: "Failed to delete lead magnet" },
      { status: 500 }
    );
  }
}
