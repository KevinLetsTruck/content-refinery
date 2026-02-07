import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/show-notes
 * List saved show notes with optional filtering.
 *
 * Query params:
 *   - show: filter by show name (tbb, destination_health, power_hour, coffee_with_kevin, custom)
 *   - status: filter by status (draft, ready, used, archived)
 *   - limit: max records to return (default 20)
 *   - from: filter showDate >= from (ISO date)
 *   - to: filter showDate <= to (ISO date)
 *   - upcoming: if 'true', filter showDate >= now, order ascending
 *   - unscheduled: if 'true', filter showDate is null
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const show = searchParams.get('show');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const upcoming = searchParams.get('upcoming');
    const unscheduled = searchParams.get('unscheduled');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (show) where.showName = show;
    if (status) where.status = status;

    // Date range filtering
    if (from || to) {
      where.showDate = {};
      if (from) where.showDate.gte = new Date(from);
      if (to) where.showDate.lte = new Date(to);
    }

    // Upcoming: showDate >= now
    if (upcoming === 'true') {
      where.showDate = { gte: new Date() };
    }

    // Unscheduled: showDate is null
    if (unscheduled === 'true') {
      where.showDate = null;
    }

    // Default ordering: newest first, unless upcoming (ascending by showDate)
    const orderBy = upcoming === 'true'
      ? { showDate: 'asc' as const }
      : { createdAt: 'desc' as const };

    const showNotes = await prisma.showNotes.findMany({
      where,
      select: {
        id: true,
        showName: true,
        customShowName: true,
        episodeTitle: true,
        status: true,
        showDate: true,
        teaserScheduledFor: true,
        teaserText: true,
        teaserContentId: true,
        outline: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
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
