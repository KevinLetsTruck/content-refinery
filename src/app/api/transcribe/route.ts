import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { transcribeAudio } from "@/lib/audio/transcription";
import { getPresignedDownloadUrl, isR2Configured } from "@/lib/storage/r2";

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for long audio files

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

    // Determine the audio URL based on storage type
    let audioUrl: string;
    
    if (source.storageType === "r2" && source.storageKey) {
      // R2 storage - get presigned download URL
      if (!isR2Configured()) {
        return NextResponse.json(
          { error: "R2 storage is not configured but source is stored in R2" },
          { status: 500 }
        );
      }
      console.log(`Getting presigned URL for R2 key: ${source.storageKey}`);
      audioUrl = await getPresignedDownloadUrl(source.storageKey);
    } else if (source.fileUrl) {
      // URL or local storage - use fileUrl directly
      // Note: Local storage URLs won't work for Deepgram since they're internal
      // For local storage, we'd need to use transcribeAudioBuffer instead
      if (source.storageType === "local") {
        return NextResponse.json(
          { error: "Local storage files cannot be transcribed remotely. Please configure R2 for cloud storage." },
          { status: 400 }
        );
      }
      audioUrl = source.fileUrl;
    } else {
      return NextResponse.json(
        { error: "Source has no file URL or storage key" },
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
      console.log(`Transcribing source ${sourceId} from URL...`);
      const result = await transcribeAudio(audioUrl);

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
