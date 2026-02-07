import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/show-notes
 * List saved show notes with optional filtering.
 *
 * Query params:
 *   - show: filter by show name (tbb, destination_health, power_hour, custom)
 *   - status: filter by status (draft, ready, used, archived)
 *   - limit: max records to return (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const show = searchParams.get('show');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const where: Record<string, unknown> = {};
    if (show) where.showName = show;
    if (status) where.status = status;

    const showNotes = await prisma.showNotes.findMany({
      where,
      select: {
        id: true,
        showName: true,
        customShowName: true,
        episodeTitle: true,
        status: true,
        showDate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ showNotes });
  } catch (error) {
    console.error('[Show Notes] Error listing show notes:', error);
    return NextResponse.json(
      { error: 'Failed to list show notes' },
      { status: 500 }
    );
  }
}
