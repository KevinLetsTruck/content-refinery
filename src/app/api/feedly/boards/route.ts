import { NextResponse } from 'next/server';
import { feedlyClient } from '@/lib/feedly/client';

/**
 * GET /api/feedly/boards
 *
 * Fetches all boards (saved article collections) from Feedly.
 */
export async function GET() {
  try {
    // Check if Feedly is configured
    if (!process.env.FEEDLY_ACCESS_TOKEN) {
      return NextResponse.json({
        configured: false,
        boards: [],
        error: 'Feedly not configured. Add FEEDLY_ACCESS_TOKEN to environment variables.',
      });
    }

    const boards = await feedlyClient.getBoards();

    return NextResponse.json({
      configured: true,
      boards,
    });
  } catch (error) {
    console.error('Feedly boards error:', error);
    return NextResponse.json(
      {
        configured: true,
        boards: [],
        error: error instanceof Error ? error.message : 'Failed to fetch boards',
      },
      { status: 500 }
    );
  }
}
