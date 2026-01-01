import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { transcribeAudio } from "@/lib/audio/deepgram";

// POST /api/transcribe - Transcribe a source
export async function POST(request: NextRequest) {
  try {
    const { sourceId } = await request.json();

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    // Get the source
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    if (!source.fileUrl) {
      return NextResponse.json(
        { error: "Source has no file URL" },
        { status: 400 }
      );
    }

    // Update status to processing
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: "processing" },
    });

    try {
      // Transcribe the audio
      console.log(`Transcribing source ${sourceId}...`);
      const result = await transcribeAudio(source.fileUrl);

      // Save transcript
      const transcript = await prisma.transcript.create({
        data: {
          sourceId,
          fullText: result.text,
          wordTimestamps: result.words,
          speakerSegments: result.speakers,
        },
      });

      // Update source with duration and status
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          status: "completed",
          durationSeconds: Math.round(result.duration),
        },
      });

      return NextResponse.json({
        transcript,
        duration: result.duration,
        wordCount: result.words.length,
      });
    } catch (transcribeError) {
      // Update source with error
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          status: "failed",
          errorMessage: transcribeError instanceof Error ? transcribeError.message : "Unknown error",
        },
      });

      throw transcribeError;
    }
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
