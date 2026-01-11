import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceType, sourceId, mode } = body;

    const session = await prisma.wizardSession.create({
      data: {
        sourceType,
        sourceId,
        mode,
        leadMagnetId: sourceType === 'guide' ? sourceId : null,
        productId: sourceType === 'product' ? sourceId : null,
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Create wizard session error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');
    const status = searchParams.get('status');

    if (sessionId) {
      const session = await prisma.wizardSession.findUnique({
        where: { id: sessionId },
        include: {
          campaign: true,
          leadMagnet: true,
        },
      });

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({ session });
    }

    // List sessions with optional status filter
    const sessions = await prisma.wizardSession.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        leadMagnet: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Get wizard session error:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, ...updates } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = await prisma.wizardSession.update({
      where: { id: sessionId },
      data: {
        ...updates,
        updatedAt: new Date(),
        ...(updates.status === 'completed' ? { completedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Update wizard session error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
