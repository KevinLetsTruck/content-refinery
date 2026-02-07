import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/show-notes/save
 * Create or update show notes.
 *
 * If `id` is provided in the body, updates the existing record.
 * Otherwise, creates a new record.
 *
 * Body:
 *   - id?: string (if updating)
 *   - showName: string
 *   - customShowName?: string
 *   - episodeTitle?: string
 *   - sourceItems: JSON
 *   - outline?: JSON
 *   - publicNotes?: JSON
 *   - teaserText?: string
 *   - status?: string
 *   - showDate?: string (ISO date)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      showName,
      customShowName,
      episodeTitle,
      sourceItems,
      outline,
      publicNotes,
      teaserText,
      status,
      showDate,
    } = body;

    // Validate required fields for create
    if (!id && !showName) {
      return NextResponse.json(
        { error: 'showName is required when creating new show notes' },
        { status: 400 }
      );
    }

    if (!id && (!sourceItems || !Array.isArray(sourceItems))) {
      return NextResponse.json(
        { error: 'sourceItems (array) is required when creating new show notes' },
        { status: 400 }
      );
    }

    if (id) {
      // UPDATE existing record
      const existing = await prisma.showNotes.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: 'Show notes not found' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (showName !== undefined) updateData.showName = showName;
      if (customShowName !== undefined) updateData.customShowName = customShowName;
      if (episodeTitle !== undefined) updateData.episodeTitle = episodeTitle;
      if (sourceItems !== undefined) updateData.sourceItems = sourceItems;
      if (outline !== undefined) updateData.outline = outline;
      if (publicNotes !== undefined) updateData.publicNotes = publicNotes;
      if (teaserText !== undefined) updateData.teaserText = teaserText;
      if (status !== undefined) updateData.status = status;
      if (showDate !== undefined) updateData.showDate = new Date(showDate);

      await prisma.showNotes.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ id, status: updateData.status || existing.status });
    } else {
      // CREATE new record
      const record = await prisma.showNotes.create({
        data: {
          showName,
          customShowName: customShowName || null,
          episodeTitle: episodeTitle || null,
          sourceItems,
          outline: outline || null,
          publicNotes: publicNotes || null,
          teaserText: teaserText || null,
          status: status || 'draft',
          showDate: showDate ? new Date(showDate) : null,
        },
      });

      return NextResponse.json({ id: record.id, status: record.status });
    }
  } catch (error) {
    console.error('[Show Notes Save] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save show notes' },
      { status: 500 }
    );
  }
}
