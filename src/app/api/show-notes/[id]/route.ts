import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/show-notes/[id]
 * Fetch a single show notes record with all fields.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const showNotes = await prisma.showNotes.findUnique({
      where: { id },
    });

    if (!showNotes) {
      return NextResponse.json(
        { error: 'Show notes not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ showNotes });
  } catch (error) {
    console.error('[Show Notes] Error fetching show notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch show notes' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/show-notes/[id]
 * Update specific fields on a show notes record.
 *
 * Body (all optional):
 *   - episodeTitle: string
 *   - outline: JSON
 *   - publicNotes: JSON
 *   - teaserText: string
 *   - status: string
 *   - showDate: string (ISO date)
 *   - teaserScheduledFor: string (ISO date)
 *   - showName: string
 *   - customShowName: string
 *   - sourceItems: JSON
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify record exists
    const existing = await prisma.showNotes.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Show notes not found' },
        { status: 404 }
      );
    }

    // Extract only allowed fields
    const updateData: Record<string, unknown> = {};
    if (body.episodeTitle !== undefined) updateData.episodeTitle = body.episodeTitle;
    if (body.outline !== undefined) updateData.outline = body.outline;
    if (body.publicNotes !== undefined) updateData.publicNotes = body.publicNotes;
    if (body.teaserText !== undefined) updateData.teaserText = body.teaserText;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.showDate !== undefined) updateData.showDate = body.showDate ? new Date(body.showDate) : null;
    if (body.teaserScheduledFor !== undefined) updateData.teaserScheduledFor = body.teaserScheduledFor ? new Date(body.teaserScheduledFor) : null;
    if (body.showName !== undefined) updateData.showName = body.showName;
    if (body.customShowName !== undefined) updateData.customShowName = body.customShowName;
    if (body.sourceItems !== undefined) updateData.sourceItems = body.sourceItems;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    const showNotes = await prisma.showNotes.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, showNotes });
  } catch (error) {
    console.error('[Show Notes] Error updating show notes:', error);
    return NextResponse.json(
      { error: 'Failed to update show notes' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/show-notes/[id]
 * Delete a show notes record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.showNotes.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Show notes not found' },
        { status: 404 }
      );
    }

    await prisma.showNotes.delete({
      where: { id },
    });

    console.log(`[Show Notes] Deleted show notes: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Show Notes] Error deleting show notes:', error);
    return NextResponse.json(
      { error: 'Failed to delete show notes' },
      { status: 500 }
    );
  }
}
