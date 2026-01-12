import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export interface Episode {
  id: string;
  title: string;
  originalFilename: string | null;
  fileUrl: string | null;
  status: string;
  durationSeconds: number | null;
  durationFormatted: string | null;
  hasTranscript: boolean;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

/**
 * GET /api/episodes
 *
 * List episodes from Sources table
 *
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - status: filter by status
 * - hasTranscript: "true" | "false" - filter by transcript availability
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const status = searchParams.get("status");
    const hasTranscript = searchParams.get("hasTranscript");

    // Build where clause
    const where: Record<string, unknown> = {
      sourceType: "audio",
      contentType: "episode",
    };

    if (status) {
      where.status = status;
    }

    // Get episodes with transcript count
    const episodes = await prisma.source.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: { transcripts: true },
        },
      },
    });

    // Get total count
    const total = await prisma.source.count({ where });

    // Format response
    const formattedEpisodes: Episode[] = episodes
      .filter((ep) => {
        // Filter by hasTranscript if specified
        if (hasTranscript === "true") {
          return ep._count.transcripts > 0;
        }
        if (hasTranscript === "false") {
          return ep._count.transcripts === 0;
        }
        return true;
      })
      .map((ep) => ({
        id: ep.id,
        title: ep.title,
        originalFilename: ep.originalFilename,
        fileUrl: ep.fileUrl,
        status: ep.status,
        durationSeconds: ep.durationSeconds,
        durationFormatted: ep.durationSeconds
          ? formatDuration(ep.durationSeconds)
          : null,
        hasTranscript: ep._count.transcripts > 0,
        createdAt: ep.createdAt.toISOString(),
        metadata: ep.metadata as Record<string, unknown> | null,
      }));

    return NextResponse.json({
      episodes: formattedEpisodes,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[Episodes] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list episodes" },
      { status: 500 }
    );
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
